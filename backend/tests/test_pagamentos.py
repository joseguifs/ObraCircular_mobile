import hashlib
import hmac
import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import patch
from uuid import UUID, uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.db.session import get_db
from app.integrations.mercado_pago import MercadoPagoErro, validar_assinatura_webhook
from app.models.anuncio import Anuncio
from app.models.pagamento import Pagamento
from app.models.pedido import Pedido
from app.models.usuario import Usuario
from app.routes import pagamentos

SEGREDO = "segredo-do-webhook-de-teste"


class GatewayFalso:
    """Substitui a API do Mercado Pago nos testes."""

    def __init__(self):
        self.criados = []
        self.pagamentos = {}
        self.reembolsos = []
        self.erro_criacao = None
        self.proximo_id = 1000

    def criar_pagamento(self, payload, *, idempotency_key):
        if self.erro_criacao:
            raise self.erro_criacao
        self.criados.append(payload)
        self.proximo_id += 1
        pagamento_id = str(self.proximo_id)
        self.pagamentos[pagamento_id] = {
            "id": int(pagamento_id),
            "status": "pending",
            "status_detail": "pending_waiting_transfer",
            "external_reference": payload["external_reference"],
            "transaction_amount": payload["transaction_amount"],
            "payment_method_id": "pix",
            "payment_type_id": "bank_transfer",
            "live_mode": False,
            "metadata": payload["metadata"],
        }
        return {
            **self.pagamentos[pagamento_id],
            "point_of_interaction": {
                "transaction_data": {
                    "qr_code": f"00020126580014br.gov.bcb.pix{pagamento_id}",
                    "qr_code_base64": "iVBORw0KGgo=",
                    "ticket_url": f"https://mp.test/pix/{pagamento_id}",
                }
            },
        }

    def obter_pagamento(self, pagamento_id):
        if pagamento_id not in self.pagamentos:
            raise MercadoPagoErro("não encontrado", status_code=404)
        return self.pagamentos[pagamento_id]

    def buscar_pagamentos(self, external_reference):
        return [p for p in self.pagamentos.values() if p["external_reference"] == external_reference]

    def reembolsar_pagamento(self, pagamento_id, *, idempotency_key):
        self.reembolsos.append(pagamento_id)
        return {"id": 1, "status": "approved"}


def assinar(data_id, request_id="req-1", ts="1700000000"):
    manifesto = f"id:{data_id};request-id:{request_id};ts:{ts};"
    assinatura = hmac.new(SEGREDO.encode(), manifesto.encode(), hashlib.sha256).hexdigest()
    return {"x-signature": f"ts={ts},v1={assinatura}", "x-request-id": request_id}


class PagamentoPixTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

        @event.listens_for(self.engine, "connect")
        def registrar_funcoes(conexao, _):
            conexao.create_function("gen_random_uuid", 0, lambda: uuid4().hex)

        for modelo in (Usuario, Anuncio, Pedido, Pagamento):
            modelo.__table__.create(self.engine)
        self.db = Session(self.engine, expire_on_commit=False)

        self.vendedor_id, self.comprador_id, self.outro_id = uuid4(), uuid4(), uuid4()
        self.anuncio_id = uuid4()
        self.db.add_all([
            Usuario(id=self.vendedor_id, nome="Maria Silva", email="maria@example.com", senha_hash="h", status="ATIVO"),
            Usuario(id=self.comprador_id, nome="João Souza", email="joao@example.com", senha_hash="h", status="ATIVO"),
            Usuario(id=self.outro_id, nome="Ana Lima", email="ana@example.com", senha_hash="h", status="ATIVO"),
            Anuncio(
                id=self.anuncio_id, titulo="Sobras de piso cerâmico", descricao="Quatro caixas fechadas.",
                categoria_id=uuid4(), vendedor_id=self.vendedor_id, endereco_id=uuid4(),
                preco=Decimal("120.00"), quantidade=Decimal("4"), unidade="CAIXA", status="ATIVO",
            ),
        ])
        self.db.commit()

        self.settings = Settings(
            _env_file=None,
            database_url="sqlite://",
            mp_access_token="TEST-token",
            mp_webhook_secret_test=SEGREDO,
            mp_public_base_url="https://obra.ngrok-free.app",
            mp_checkout_minutes=30,
        )
        self.gateway = GatewayFalso()
        self.patches = [
            patch("app.services.pagamento_pix.get_settings", return_value=self.settings),
            patch("app.services.pagamento_pix.MercadoPagoGateway", return_value=self.gateway),
        ]
        for item in self.patches:
            item.start()

        app = FastAPI()
        app.include_router(pagamentos.pedidos_router, prefix="/api/v1/pedidos")
        app.include_router(pagamentos.webhooks_router, prefix="/api/v1/webhooks")
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)

    def tearDown(self):
        for item in self.patches:
            item.stop()
        self.client.close()
        self.db.close()
        self.engine.dispose()

    # ------------------------------------------------------------ auxiliares

    def checkout(self, comprador_id=None):
        return self.client.post(
            "/api/v1/pedidos/checkout-pix",
            json={"anuncio_id": str(self.anuncio_id), "comprador_id": str(comprador_id or self.comprador_id)},
        )

    def comprar(self, comprador_id=None):
        """Gera o Pix e devolve (pedido_id, id do pagamento no Mercado Pago)."""
        corpo = self.checkout(comprador_id).json()
        return corpo["id"], corpo["pagamento"]["pagamento_externo_id"]

    def mudar_status(self, pagamento_id, status, **extras):
        self.gateway.pagamentos[pagamento_id].update({"status": status, **extras})

    def webhook(self, pagamento_id, headers=None):
        return self.client.post(
            f"/api/v1/webhooks/mercado-pago?data.id={pagamento_id}&type=payment",
            json={"type": "payment", "action": "payment.updated", "data": {"id": pagamento_id}},
            headers=headers if headers is not None else assinar(pagamento_id),
        )

    def vencer(self, pedido_id):
        pedido = self.db.get(Pedido, UUID(pedido_id))
        pedido.expira_em = datetime.now(timezone.utc) - timedelta(minutes=1)
        self.db.commit()

    def anuncio(self):
        return self.db.get(Anuncio, self.anuncio_id, populate_existing=True)

    def pedido(self, pedido_id, comprador_id=None):
        return self.client.get(
            f"/api/v1/pedidos/{pedido_id}", params={"comprador_id": str(comprador_id or self.comprador_id)}
        ).json()

    # ---------------------------------------------------------------- testes

    def test_checkout_gera_qr_code_pix(self):
        resposta = self.checkout()

        self.assertEqual(resposta.status_code, 201, resposta.text)
        corpo = resposta.json()
        self.assertEqual(corpo["status"], "AGUARDANDO_PAGAMENTO")
        self.assertTrue(corpo["pix"]["qr_code"].startswith("00020126"))
        self.assertEqual(corpo["pix"]["qr_code_base64"], "iVBORw0KGgo=")
        self.assertEqual(corpo["pagamento"]["status"], "PENDENTE")

        payload = self.gateway.criados[0]
        self.assertEqual(payload["payment_method_id"], "pix")
        self.assertEqual(payload["transaction_amount"], 120.0)
        self.assertEqual(payload["external_reference"], corpo["id"])
        self.assertEqual(payload["payer"]["email"], "joao@example.com")
        self.assertEqual(
            payload["notification_url"],
            "https://obra.ngrok-free.app/api/v1/webhooks/mercado-pago?source_news=webhooks",
        )
        # O Pix vence junto com a reserva, nunca antes do mínimo de 30 minutos exigido.
        vencimento = datetime.fromisoformat(payload["date_of_expiration"])
        self.assertEqual(vencimento, datetime.fromisoformat(corpo["expira_em"]))
        self.assertGreater(vencimento - datetime.now(timezone.utc), timedelta(minutes=30))

    def test_sem_url_publica_nao_envia_notification_url_e_usa_email_de_teste(self):
        self.settings.mp_public_base_url = None
        self.settings.mp_test_payer_email = "test@testuser.com"

        self.assertEqual(self.checkout().status_code, 201)
        payload = self.gateway.criados[0]
        self.assertNotIn("notification_url", payload)
        self.assertEqual(payload["payer"]["email"], "test@testuser.com")

    def test_checkout_reaproveita_o_pix_do_mesmo_comprador(self):
        primeiro = self.checkout().json()
        segundo = self.checkout()

        self.assertEqual(segundo.status_code, 201)
        self.assertEqual(segundo.json()["id"], primeiro["id"])
        self.assertEqual(segundo.json()["pix"]["qr_code"], primeiro["pix"]["qr_code"])
        self.assertEqual(len(self.gateway.criados), 1)

    def test_pix_cancelado_do_mesmo_comprador_gera_nova_cobranca(self):
        pedido_id, pagamento_id = self.comprar()
        pagamento = self.db.query(Pagamento).one()
        pagamento.status = "RECUSADO"
        self.db.commit()

        novo = self.checkout().json()

        self.assertNotEqual(novo["id"], pedido_id)
        self.assertEqual(len(self.gateway.criados), 2)
        self.assertEqual(self.pedido(pedido_id)["status"], "CANCELADO")

    def test_anuncio_reservado_bloqueia_outro_comprador_ate_expirar(self):
        pedido_id, _ = self.comprar()

        self.assertEqual(self.checkout(comprador_id=self.outro_id).status_code, 409)

        self.vencer(pedido_id)
        liberado = self.checkout(comprador_id=self.outro_id)
        self.assertEqual(liberado.status_code, 201, liberado.text)
        self.assertEqual(self.pedido(pedido_id)["status"], "EXPIRADO")
        self.assertIsNone(self.pedido(pedido_id)["pix"])

    def test_regras_de_compra(self):
        self.assertEqual(self.checkout(comprador_id=self.vendedor_id).status_code, 409)
        self.assertEqual(self.checkout(comprador_id=uuid4()).status_code, 403)

        anuncio = self.anuncio()
        anuncio.preco = Decimal("0")
        self.db.commit()
        self.assertEqual(self.checkout().status_code, 409)

    def test_checkout_sem_credencial_retorna_503(self):
        self.settings.mp_access_token = None
        self.assertEqual(self.checkout().status_code, 503)

    def test_recusa_do_mercado_pago_cancela_o_pedido(self):
        self.gateway.erro_criacao = MercadoPagoErro("sem chave pix", status_code=400)

        resposta = self.checkout()

        self.assertEqual(resposta.status_code, 502)
        self.assertIn("chave Pix", resposta.json()["detail"])
        self.assertEqual(self.db.query(Pedido).one().status, "CANCELADO")
        self.gateway.erro_criacao = None
        self.assertEqual(self.checkout(comprador_id=self.outro_id).status_code, 201)

    def test_webhook_aprovado_conclui_a_venda_e_esgota_anuncio(self):
        pedido_id, pagamento_id = self.comprar()
        self.mudar_status(pagamento_id, "approved", status_detail="accredited")

        resposta = self.webhook(pagamento_id)

        self.assertEqual(resposta.status_code, 200, resposta.text)
        pedido = self.pedido(pedido_id)
        self.assertEqual(pedido["status"], "PAGO")
        self.assertEqual(pedido["pagamento"]["status"], "APROVADO")
        self.assertEqual(pedido["pagamento"]["metodo"], "PIX")
        self.assertIsNone(pedido["pix"])
        self.assertEqual(self.anuncio().status, "ESGOTADO")
        self.assertEqual(self.checkout(comprador_id=self.outro_id).status_code, 409)
        # Reenvio do mesmo evento é idempotente.
        self.assertEqual(self.webhook(pagamento_id).status_code, 200)
        self.assertEqual(self.pedido(pedido_id)["status"], "PAGO")

    def test_webhook_rejeita_assinatura_invalida(self):
        pedido_id, pagamento_id = self.comprar()
        self.mudar_status(pagamento_id, "approved")

        self.assertEqual(self.webhook(pagamento_id, headers={}).status_code, 401)
        invalida = {"x-signature": "ts=1,v1=abc", "x-request-id": "r"}
        self.assertEqual(self.webhook(pagamento_id, headers=invalida).status_code, 401)
        self.assertEqual(self.pedido(pedido_id)["status"], "AGUARDANDO_PAGAMENTO")

    def test_webhook_ignora_valor_divergente_e_pagamento_desconhecido(self):
        pedido_id, pagamento_id = self.comprar()
        self.mudar_status(pagamento_id, "approved", transaction_amount=1.0)
        self.assertEqual(self.webhook(pagamento_id).status_code, 200)

        self.gateway.pagamentos["777"] = {
            "id": 777, "status": "approved", "external_reference": pedido_id,
            "transaction_amount": 120.0, "metadata": {},
        }
        self.assertEqual(self.webhook("777").status_code, 200)

        self.assertEqual(self.pedido(pedido_id)["status"], "AGUARDANDO_PAGAMENTO")

    def test_pix_vencido_no_mercado_pago_expira_o_pedido(self):
        pedido_id, pagamento_id = self.comprar()
        self.mudar_status(pagamento_id, "cancelled", status_detail="expired")

        self.webhook(pagamento_id)

        self.assertEqual(self.pedido(pedido_id)["status"], "EXPIRADO")
        self.assertEqual(self.checkout(comprador_id=self.outro_id).status_code, 201)

    def test_sincronizar_consulta_o_mercado_pago(self):
        pedido_id, pagamento_id = self.comprar()
        self.mudar_status(pagamento_id, "approved")

        resposta = self.client.post(
            f"/api/v1/pedidos/{pedido_id}/sincronizar", params={"comprador_id": str(self.comprador_id)}
        )

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()["status"], "PAGO")
        outro = self.client.get(f"/api/v1/pedidos/{pedido_id}", params={"comprador_id": str(self.outro_id)})
        self.assertEqual(outro.status_code, 404)

    def test_pix_tardio_com_anuncio_vendido_e_devolvido(self):
        primeiro, pagamento_primeiro = self.comprar()
        self.vencer(primeiro)
        _, pagamento_segundo = self.comprar(comprador_id=self.outro_id)
        self.mudar_status(pagamento_segundo, "approved")
        self.webhook(pagamento_segundo)

        self.mudar_status(pagamento_primeiro, "approved")
        self.assertEqual(self.webhook(pagamento_primeiro).status_code, 200)

        self.assertEqual(self.gateway.reembolsos, [pagamento_primeiro])
        self.assertEqual(self.pedido(primeiro)["status"], "REEMBOLSADO")
        self.assertEqual(self.anuncio().status, "ESGOTADO")

    def test_pix_tardio_com_anuncio_livre_conclui_a_compra(self):
        pedido_id, pagamento_id = self.comprar()
        self.vencer(pedido_id)
        self.assertEqual(self.pedido(pedido_id)["status"], "EXPIRADO")

        self.mudar_status(pagamento_id, "approved")
        self.webhook(pagamento_id)

        self.assertEqual(self.pedido(pedido_id)["status"], "PAGO")
        self.assertEqual(self.gateway.reembolsos, [])

    def test_reembolso_devolve_o_anuncio_a_vitrine(self):
        pedido_id, pagamento_id = self.comprar()
        self.mudar_status(pagamento_id, "approved")
        self.webhook(pagamento_id)

        self.mudar_status(pagamento_id, "refunded")
        self.webhook(pagamento_id)

        self.assertEqual(self.pedido(pedido_id)["status"], "REEMBOLSADO")
        anuncio = self.anuncio()
        self.assertEqual(anuncio.status, "ATIVO")
        self.assertEqual(anuncio.quantidade, Decimal("4"))

    def test_lista_somente_os_pedidos_do_comprador(self):
        primeiro, _ = self.comprar()
        self.vencer(primeiro)
        # O SQLite grava criado_em com precisão de segundos: garante a ordem do teste.
        self.db.get(Pedido, UUID(primeiro)).criado_em = datetime.now(timezone.utc) - timedelta(hours=1)
        self.db.commit()
        segundo, pagamento_segundo = self.comprar()
        self.mudar_status(pagamento_segundo, "approved")
        self.webhook(pagamento_segundo)
        self.assertEqual(self.checkout(comprador_id=self.outro_id).status_code, 409)

        resposta = self.client.get("/api/v1/pedidos", params={"comprador_id": str(self.comprador_id)})

        self.assertEqual(resposta.status_code, 200)
        pedidos = resposta.json()
        self.assertEqual([p["id"] for p in pedidos], [segundo, primeiro])
        self.assertEqual([p["status"] for p in pedidos], ["PAGO", "EXPIRADO"])
        self.assertEqual(
            self.client.get("/api/v1/pedidos", params={"comprador_id": str(self.outro_id)}).json(), []
        )
        vazio = self.client.get("/api/v1/pedidos", params={"comprador_id": str(uuid4())})
        self.assertEqual(vazio.json(), [])
        self.assertEqual(self.client.get("/api/v1/pedidos").status_code, 422)

    def test_validar_assinatura(self):
        cabecalhos = assinar("ABC123")
        self.assertTrue(validar_assinatura_webhook(
            x_signature=cabecalhos["x-signature"], x_request_id="req-1", data_id="ABC123", secret=SEGREDO,
        ))
        self.assertFalse(validar_assinatura_webhook(
            x_signature=cabecalhos["x-signature"], x_request_id="req-2", data_id="ABC123", secret=SEGREDO,
        ))


if __name__ == "__main__":
    unittest.main()
