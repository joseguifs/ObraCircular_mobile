import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.core.security import gerar_hash_senha
from app.db.session import get_db
from app.models.anuncio import Anuncio
from app.models.anuncio_pergunta import AnuncioPergunta
from app.models.categoria import Categoria
from app.models.pagamento import Pagamento
from app.models.pedido import Pedido
from app.models.repasse import Repasse
from app.models.sessao_admin import SessaoAdmin
from app.models.usuario import Usuario
from app.routes.admin import router
from app.services.repasses import calcular_valores

SENHA = "Senha12345"
URL = "/api/v1/admin/repasses"


class RepassesAdminTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        # Categoria e perguntas são consultadas pelo resumo do painel.
        for modelo in (Usuario, Categoria, Anuncio, AnuncioPergunta, SessaoAdmin, Pedido, Pagamento, Repasse):
            modelo.__table__.create(self.engine)
        self.db = Session(self.engine, expire_on_commit=False)

        self.admin_id, self.vendedor_id, self.comprador_id = uuid4(), uuid4(), uuid4()
        self.db.add_all([
            Usuario(id=self.admin_id, nome="Ana Admin", email="admin@example.com",
                    senha_hash=gerar_hash_senha(SENHA), papel="ADMIN", status="ATIVO"),
            Usuario(id=self.vendedor_id, nome="Maria Silva", email="maria@example.com", senha_hash="h",
                    telefone="+5563999998888", chave_pix="maria@example.com", status="ATIVO"),
            Usuario(id=self.comprador_id, nome="João Souza", email="joao@example.com", senha_hash="h",
                    status="ATIVO"),
        ])
        self.db.commit()
        self.agora = datetime.now(timezone.utc)

        self.configurar_taxa(Decimal("20"))
        app = FastAPI()
        app.include_router(router, prefix="/api/v1/admin")
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)
        self.cabecalho = self.entrar()

    def tearDown(self):
        self.patch_settings.stop()
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def configurar_taxa(self, percentual: Decimal):
        if hasattr(self, "patch_settings"):
            self.patch_settings.stop()
        settings = Settings(_env_file=None, database_url="sqlite://", marketplace_fee_percent=percentual)
        self.patch_settings = patch("app.services.repasses.get_settings", return_value=settings)
        self.patch_settings.start()

    def entrar(self) -> dict[str, str]:
        resposta = self.client.post("/api/v1/admin/login", json={"email": "admin@example.com", "senha": SENHA})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        return {"Authorization": f"Bearer {resposta.json()['token']}"}

    def criar_pedido(self, status="PAGO", valor="120.00", vendedor_id=None, pago_ha_horas=1):
        """Cria um anúncio vendido e o pedido com o pagamento aprovado no Mercado Pago."""

        anuncio_id, pedido_id = uuid4(), uuid4()
        pago_em = self.agora - timedelta(hours=pago_ha_horas)
        self.db.add(Anuncio(
            id=anuncio_id, titulo="Sobras de piso cerâmico", descricao="Quatro caixas fechadas.",
            categoria_id=uuid4(), vendedor_id=vendedor_id or self.vendedor_id, endereco_id=uuid4(),
            preco=Decimal(valor), quantidade=Decimal("0"), unidade="CAIXA", status="ESGOTADO",
        ))
        self.db.flush()
        self.db.add(Pedido(
            id=pedido_id, comprador_id=self.comprador_id, anuncio_id=anuncio_id,
            titulo="Sobras de piso cerâmico", quantidade=Decimal("4"), unidade="CAIXA",
            valor_total=Decimal(valor), status=status, criado_em=pago_em, atualizado_em=pago_em,
            expira_em=pago_em + timedelta(minutes=30), pago_em=pago_em if status == "PAGO" else None,
        ))
        self.db.flush()
        self.db.add(Pagamento(
            id=uuid4(), pedido_id=pedido_id, pagamento_externo_id=f"mp-{pedido_id.hex[:8]}",
            valor=Decimal(valor), status="APROVADO" if status == "PAGO" else "CANCELADO",
            criado_em=pago_em, atualizado_em=pago_em, aprovado_em=pago_em if status == "PAGO" else None,
        ))
        self.db.commit()
        return pedido_id

    def pagar(self, pedido_id, dados=None):
        return self.client.post(f"{URL}/{pedido_id}/pagar", json=dados, headers=self.cabecalho)

    def test_calculo_da_taxa_arredonda_em_centavos(self):
        self.assertEqual(calcular_valores(Decimal("120.00"), Decimal("20")), (Decimal("24.00"), Decimal("96.00")))
        self.assertEqual(calcular_valores(Decimal("99.99"), Decimal("12.5")), (Decimal("12.50"), Decimal("87.49")))
        self.assertEqual(calcular_valores(Decimal("10.00"), Decimal("0")), (Decimal("0.00"), Decimal("10.00")))

    def test_lista_somente_pedidos_pagos_como_pendentes(self):
        pago_id = self.criar_pedido()
        for status in ("AGUARDANDO_PAGAMENTO", "CANCELADO", "EXPIRADO", "REEMBOLSADO"):
            self.criar_pedido(status=status)

        resposta = self.client.get(URL, headers=self.cabecalho)
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(len(resposta.json()), 1)
        repasse = resposta.json()[0]
        self.assertEqual(repasse["pedido_id"], str(pago_id))
        self.assertIsNone(repasse["repasse_id"])
        self.assertEqual(repasse["status"], "PENDENTE")
        self.assertEqual(repasse["vendedor_nome"], "Maria Silva")
        self.assertEqual(repasse["vendedor_telefone"], "+5563999998888")
        self.assertEqual(repasse["chave_pix"], "maria@example.com")
        self.assertEqual(repasse["pagamento_externo_id"], f"mp-{pago_id.hex[:8]}")
        self.assertEqual(
            (repasse["valor_bruto"], repasse["taxa_marketplace"], repasse["valor_liquido"]),
            ("120.00", "24.00", "96.00"),
        )
        self.assertFalse(repasse["alerta_reembolso"])

    def test_ordena_do_pagamento_mais_antigo_ao_mais_recente(self):
        recente = self.criar_pedido(pago_ha_horas=1)
        antigo = self.criar_pedido(pago_ha_horas=48)
        ids = [item["pedido_id"] for item in self.client.get(URL, headers=self.cabecalho).json()]
        self.assertEqual(ids, [str(antigo), str(recente)])

    def test_marcar_como_repassado(self):
        pedido_id = self.criar_pedido()
        resposta = self.pagar(pedido_id, {"observacao": "  comprovante E123  "})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        repasse = resposta.json()
        self.assertEqual(repasse["status"], "PAGO")
        self.assertEqual(repasse["observacao"], "comprovante E123")
        self.assertEqual(repasse["admin_id"], str(self.admin_id))
        self.assertIsNotNone(repasse["repassado_em"])

        salvo = self.db.query(Repasse).one()
        self.assertEqual((salvo.valor_bruto, salvo.taxa_marketplace, salvo.valor_liquido),
                         (Decimal("120.00"), Decimal("24.00"), Decimal("96.00")))
        self.assertEqual(salvo.vendedor_id, self.vendedor_id)

        self.assertEqual(self.client.get(f"{URL}?status=PENDENTE", headers=self.cabecalho).json(), [])
        pagos = self.client.get(f"{URL}?status=PAGO", headers=self.cabecalho).json()
        self.assertEqual([item["pedido_id"] for item in pagos], [str(pedido_id)])

        resumo = self.client.get("/api/v1/admin/resumo", headers=self.cabecalho).json()["repasses"]
        self.assertEqual(resumo, {"pendentes": 0, "pagos": 1, "alertas": 0})

    def test_observacao_e_opcional(self):
        resposta = self.pagar(self.criar_pedido())
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertIsNone(resposta.json()["observacao"])

    def test_valores_gravados_nao_mudam_com_a_taxa(self):
        pedido_id = self.criar_pedido()
        self.assertEqual(self.pagar(pedido_id).status_code, 200)
        pendente_id = self.criar_pedido()

        self.configurar_taxa(Decimal("10"))
        itens = {item["pedido_id"]: item for item in self.client.get(URL, headers=self.cabecalho).json()}
        self.assertEqual(itens[str(pedido_id)]["valor_liquido"], "96.00")
        self.assertEqual(itens[str(pendente_id)]["valor_liquido"], "108.00")

    def test_impede_repasse_duplicado_e_pedido_nao_pago(self):
        pedido_id = self.criar_pedido()
        self.assertEqual(self.pagar(pedido_id).status_code, 200)
        self.assertEqual(self.pagar(pedido_id).status_code, 409)
        self.assertEqual(self.db.query(Repasse).count(), 1)

        for status in ("AGUARDANDO_PAGAMENTO", "CANCELADO", "EXPIRADO", "REEMBOLSADO"):
            with self.subTest(status=status):
                self.assertEqual(self.pagar(self.criar_pedido(status=status)).status_code, 409)
        self.assertEqual(self.pagar(uuid4()).status_code, 404)

    def test_exige_chave_pix_do_vendedor(self):
        vendedor_sem_chave = uuid4()
        self.db.add(Usuario(id=vendedor_sem_chave, nome="Carlos Lima", email="carlos@example.com",
                            senha_hash="h", status="ATIVO"))
        self.db.commit()
        pedido_id = self.criar_pedido(vendedor_id=vendedor_sem_chave)

        item = self.client.get(URL, headers=self.cabecalho).json()[0]
        self.assertIsNone(item["chave_pix"])
        resposta = self.pagar(pedido_id)
        self.assertEqual(resposta.status_code, 409)
        self.assertIn("chave Pix", resposta.json()["detail"])

    def test_alerta_quando_pedido_e_reembolsado_apos_repasse(self):
        pedido_id = self.criar_pedido()
        self.assertEqual(self.pagar(pedido_id).status_code, 200)

        pedido = self.db.get(Pedido, pedido_id)
        pedido.status = "REEMBOLSADO"
        self.db.commit()

        pagos = self.client.get(f"{URL}?status=PAGO", headers=self.cabecalho).json()
        self.assertEqual(len(pagos), 1)
        self.assertTrue(pagos[0]["alerta_reembolso"])
        self.assertEqual(pagos[0]["pedido_status"], "REEMBOLSADO")
        resumo = self.client.get("/api/v1/admin/resumo", headers=self.cabecalho).json()["repasses"]
        self.assertEqual(resumo["alertas"], 1)

    def test_exige_sessao_administrativa(self):
        pedido_id = self.criar_pedido()
        self.assertEqual(self.client.get(URL).status_code, 401)
        self.assertEqual(self.client.post(f"{URL}/{pedido_id}/pagar").status_code, 401)
        self.assertEqual(self.client.get(f"{URL}?status=INVALIDO", headers=self.cabecalho).status_code, 422)
        self.assertEqual(self.pagar(pedido_id, {"observacao": "a" * 256}).status_code, 422)


if __name__ == "__main__":
    unittest.main()
