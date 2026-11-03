import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.session import get_db
from app.models.anuncio import Anuncio
from app.models.anuncio_pergunta import AnuncioPergunta
from app.models.usuario import Usuario
from app.routes.anuncio_perguntas import router


class AnuncioPerguntasEndpointsTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Usuario.__table__.create(self.engine)
        Anuncio.__table__.create(self.engine)
        AnuncioPergunta.__table__.create(self.engine)
        self.db = Session(self.engine)

        self.vendedor_id = uuid4()
        self.comprador_id = uuid4()
        self.inativo_id = uuid4()
        self.anuncio_id = uuid4()
        self.encerrado_id = uuid4()
        self.excluido_id = uuid4()
        agora = datetime.now(timezone.utc)

        self.db.add_all(
            [
                Usuario(id=self.vendedor_id, nome="Maria Silva", email="maria@example.com", senha_hash="hash", status="ATIVO"),
                Usuario(id=self.comprador_id, nome="João Souza", email="joao@example.com", senha_hash="hash", status="ATIVO"),
                Usuario(id=self.inativo_id, nome="Ana Lima", email="ana@example.com", senha_hash="hash", status="INATIVO"),
                self.novo_anuncio(self.anuncio_id, "ATIVO"),
                self.novo_anuncio(self.encerrado_id, "ENCERRADO", encerrado_em=agora),
                self.novo_anuncio(self.excluido_id, "ATIVO", deletado_em=agora),
            ]
        )
        self.db.commit()

        app = FastAPI()
        app.include_router(router, prefix="/api/v1/anuncios")
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def novo_anuncio(self, anuncio_id, situacao, **extras) -> Anuncio:
        return Anuncio(
            id=anuncio_id,
            titulo="Sobras de piso cerâmico",
            descricao="Quatro caixas fechadas que restaram da reforma.",
            categoria_id=uuid4(),
            vendedor_id=self.vendedor_id,
            endereco_id=uuid4(),
            preco=Decimal("120.00"),
            quantidade=4,
            status=situacao,
            **extras,
        )

    def url(self, anuncio_id=None) -> str:
        return f"/api/v1/anuncios/{anuncio_id or self.anuncio_id}/perguntas"

    def perguntar(self, texto="O piso ainda está disponível?", autor_id=None):
        return self.client.post(
            self.url(),
            json={"autor_id": str(autor_id or self.comprador_id), "pergunta": texto},
        )

    def responder(self, pergunta_id, texto="Sim, ainda tenho quatro caixas.", vendedor_id=None):
        return self.client.post(
            f"{self.url()}/{pergunta_id}/resposta",
            json={"vendedor_id": str(vendedor_id or self.vendedor_id), "resposta": texto},
        )

    def test_cria_pergunta_sem_resposta(self):
        resposta = self.perguntar("   O piso ainda está disponível?  ")
        self.assertEqual(resposta.status_code, 201, resposta.text)
        corpo = resposta.json()
        self.assertEqual(corpo["pergunta"], "O piso ainda está disponível?")
        self.assertEqual(corpo["autor_id"], str(self.comprador_id))
        self.assertIsNone(corpo["resposta"])
        self.assertIsNone(corpo["respondido_em"])

    def test_lista_perguntas_da_mais_recente_com_paginacao(self):
        base = datetime(2026, 10, 1, tzinfo=timezone.utc)
        for indice in range(3):
            self.db.add(
                AnuncioPergunta(
                    id=uuid4(),
                    anuncio_id=self.anuncio_id,
                    autor_id=self.comprador_id,
                    pergunta=f"Pergunta número {indice}",
                    criado_em=base + timedelta(hours=indice),
                )
            )
        self.db.commit()

        resposta = self.client.get(self.url(), params={"offset": 0, "limit": 2})
        self.assertEqual(resposta.status_code, 200)
        corpo = resposta.json()
        self.assertEqual(corpo["total"], 3)
        self.assertEqual(corpo["limit"], 2)
        self.assertEqual([item["pergunta"] for item in corpo["items"]], ["Pergunta número 2", "Pergunta número 1"])

        segunda_pagina = self.client.get(self.url(), params={"offset": 2, "limit": 2}).json()
        self.assertEqual([item["pergunta"] for item in segunda_pagina["items"]], ["Pergunta número 0"])

    def test_listagem_nao_mostra_perguntas_de_outro_anuncio(self):
        self.perguntar()
        outro = uuid4()
        self.db.add(self.novo_anuncio(outro, "ATIVO"))
        self.db.commit()
        corpo = self.client.get(self.url(outro)).json()
        self.assertEqual(corpo["total"], 0)
        self.assertEqual(corpo["items"], [])

    def test_valida_tamanho_da_pergunta(self):
        self.assertEqual(self.perguntar("  oi ").status_code, 422)
        self.assertEqual(self.perguntar("a" * 501).status_code, 422)
        self.assertEqual(self.perguntar("a" * 500).status_code, 201)

    def test_vendedor_nao_pergunta_no_proprio_anuncio(self):
        resposta = self.perguntar(autor_id=self.vendedor_id)
        self.assertEqual(resposta.status_code, 403)
        self.assertIn("próprio anúncio", resposta.json()["detail"])

    def test_usuario_inativo_ou_inexistente_nao_pergunta(self):
        self.assertEqual(self.perguntar(autor_id=self.inativo_id).status_code, 403)
        self.assertEqual(self.perguntar(autor_id=uuid4()).status_code, 403)

    def test_anuncio_encerrado_nao_recebe_perguntas(self):
        resposta = self.client.post(
            self.url(self.encerrado_id),
            json={"autor_id": str(self.comprador_id), "pergunta": "Ainda tem?"},
        )
        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(self.client.get(self.url(self.encerrado_id)).status_code, 200)

    def test_anuncio_excluido_ou_inexistente_retorna_404(self):
        for anuncio_id in (self.excluido_id, uuid4()):
            self.assertEqual(self.client.get(self.url(anuncio_id)).status_code, 404)
            resposta = self.client.post(
                self.url(anuncio_id),
                json={"autor_id": str(self.comprador_id), "pergunta": "Ainda tem?"},
            )
            self.assertEqual(resposta.status_code, 404)

    def test_vendedor_responde_uma_unica_vez(self):
        pergunta_id = self.perguntar().json()["id"]

        resposta = self.responder(pergunta_id, "  Sim, ainda tenho quatro caixas.  ")
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(resposta.json()["resposta"], "Sim, ainda tenho quatro caixas.")
        self.assertIsNotNone(resposta.json()["respondido_em"])

        segunda = self.responder(pergunta_id, "Outra resposta")
        self.assertEqual(segunda.status_code, 409)

        listada = self.client.get(self.url()).json()["items"][0]
        self.assertEqual(listada["resposta"], "Sim, ainda tenho quatro caixas.")

    def test_somente_o_vendedor_responde(self):
        pergunta_id = self.perguntar().json()["id"]
        resposta = self.responder(pergunta_id, vendedor_id=self.comprador_id)
        self.assertEqual(resposta.status_code, 403)
        self.assertIsNone(self.client.get(self.url()).json()["items"][0]["resposta"])

    def test_resposta_vazia_ou_longa_retorna_422(self):
        pergunta_id = self.perguntar().json()["id"]
        self.assertEqual(self.responder(pergunta_id, "   ").status_code, 422)
        self.assertEqual(self.responder(pergunta_id, "a" * 1001).status_code, 422)

    def test_pergunta_inexistente_ou_de_outro_anuncio_retorna_404(self):
        self.assertEqual(self.responder(uuid4()).status_code, 404)

        outro = uuid4()
        self.db.add(self.novo_anuncio(outro, "ATIVO"))
        self.db.commit()
        de_outro_anuncio = self.client.post(
            self.url(outro),
            json={"autor_id": str(self.comprador_id), "pergunta": "Aceita troca?"},
        ).json()["id"]
        self.assertEqual(self.responder(de_outro_anuncio).status_code, 404)

    def test_rejeita_campos_desconhecidos(self):
        resposta = self.client.post(
            self.url(),
            json={"autor_id": str(self.comprador_id), "pergunta": "Ainda tem?", "resposta": "sim"},
        )
        self.assertEqual(resposta.status_code, 422)


if __name__ == "__main__":
    unittest.main()
