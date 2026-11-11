import unittest
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import CheckConstraint, create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.session import get_db
from app.models.endereco import Endereco
from app.models.usuario import Usuario
from app.routes.enderecos import router


class EnderecosEndpointsTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

        # O SQLite não tem gen_random_uuid(), usado pelo Postgres como valor padrão do id.
        @event.listens_for(self.engine, "connect")
        def registrar_funcoes(conexao, _):
            conexao.create_function("gen_random_uuid", 0, lambda: uuid4().hex)

        # As restrições de CEP e UF usam regex do Postgres (~), que o SQLite não entende.
        # A validação dessas regras é feita pelo schema e coberta nos testes abaixo.
        self.restricoes_postgres = [
            restricao
            for restricao in Endereco.__table__.constraints
            if isinstance(restricao, CheckConstraint)
        ]
        for restricao in self.restricoes_postgres:
            Endereco.__table__.constraints.discard(restricao)

        Usuario.__table__.create(self.engine)
        Endereco.__table__.create(self.engine)
        self.db = Session(self.engine)
        self.usuario_id = uuid4()
        self.outro_usuario_id = uuid4()
        self.usuario_removido_id = uuid4()
        self.db.add_all([
            Usuario(id=self.usuario_id, nome="Maria Silva", email="maria@example.com",
                    senha_hash="hash"),
            Usuario(id=self.outro_usuario_id, nome="Outro Usuário", email="outro@example.com",
                    senha_hash="hash"),
            Usuario(id=self.usuario_removido_id, nome="Removido", email="removido@example.com",
                    senha_hash="hash", deletado_em=datetime.now(timezone.utc)),
        ])
        self.endereco_id = uuid4()
        self.db.add(Endereco(
            id=self.endereco_id, usuario_id=self.usuario_id, cep="77000000",
            logradouro="Quadra 104 Sul", numero="12", bairro="Plano Diretor Sul",
            cidade="Palmas", estado="TO",
        ))
        self.db.commit()

        app = FastAPI()
        app.include_router(router, prefix="/api/v1/enderecos")
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)
        self.url = "/api/v1/enderecos"
        self.payload = {
            "usuario_id": str(self.usuario_id),
            "cep": "77.000-100",
            "logradouro": "  Avenida JK  ",
            "numero": "500",
            "complemento": "  Sala 3  ",
            "bairro": "Centro",
            "cidade": "Palmas",
            "estado": "to",
        }

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()
        for restricao in self.restricoes_postgres:
            Endereco.__table__.constraints.add(restricao)

    def test_cadastra_endereco_normalizando_os_campos(self):
        resposta = self.client.post(self.url, json=self.payload)
        self.assertEqual(resposta.status_code, 201)
        corpo = resposta.json()
        self.assertEqual(corpo["cep"], "77000100")
        self.assertEqual(corpo["logradouro"], "Avenida JK")
        self.assertEqual(corpo["complemento"], "Sala 3")
        self.assertEqual(corpo["estado"], "TO")
        self.assertEqual(corpo["usuario_id"], str(self.usuario_id))
        self.assertIn("id", corpo)

    def test_complemento_vazio_vira_nulo(self):
        resposta = self.client.post(self.url, json={**self.payload, "complemento": "   "})
        self.assertEqual(resposta.status_code, 201)
        self.assertIsNone(resposta.json()["complemento"])

        sem_complemento = {k: v for k, v in self.payload.items() if k != "complemento"}
        resposta = self.client.post(self.url, json=sem_complemento)
        self.assertEqual(resposta.status_code, 201)
        self.assertIsNone(resposta.json()["complemento"])

    def test_rejeita_cep_invalido(self):
        for cep in ["", "1234567", "123456789", "abcdefgh"]:
            resposta = self.client.post(self.url, json={**self.payload, "cep": cep})
            self.assertEqual(resposta.status_code, 422, cep)

    def test_rejeita_uf_invalida(self):
        for estado in ["XX", "T", "TOO"]:
            resposta = self.client.post(self.url, json={**self.payload, "estado": estado})
            self.assertEqual(resposta.status_code, 422, estado)

    def test_rejeita_texto_obrigatorio_vazio(self):
        for campo in ["logradouro", "numero", "bairro", "cidade"]:
            resposta = self.client.post(self.url, json={**self.payload, campo: "   "})
            self.assertEqual(resposta.status_code, 422, campo)

    def test_valida_campos_obrigatorios(self):
        self.assertEqual(self.client.post(self.url, json={}).status_code, 422)
        sem_usuario = {k: v for k, v in self.payload.items() if k != "usuario_id"}
        self.assertEqual(self.client.post(self.url, json=sem_usuario).status_code, 422)

    def test_cadastro_exige_usuario_ativo(self):
        for usuario_id in [uuid4(), self.usuario_removido_id]:
            resposta = self.client.post(
                self.url, json={**self.payload, "usuario_id": str(usuario_id)},
            )
            self.assertEqual(resposta.status_code, 404)
            self.assertEqual(resposta.json()["detail"], "Usuário não encontrado")

    def test_consulta_por_id(self):
        resposta = self.client.get(f"{self.url}/{self.endereco_id}")
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()["cidade"], "Palmas")
        self.assertEqual(resposta.json()["cep"], "77000000")

        self.assertEqual(self.client.get(f"{self.url}/{uuid4()}").status_code, 404)
        self.assertEqual(self.client.get(f"{self.url}/nao-e-uuid").status_code, 422)

    def test_lista_enderecos_apenas_do_usuario(self):
        self.client.post(self.url, json=self.payload)
        self.client.post(
            self.url, json={**self.payload, "usuario_id": str(self.outro_usuario_id)},
        )

        resposta = self.client.get(f"{self.url}/usuario/{self.usuario_id}")
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(resposta.json()), 2)
        self.assertTrue(all(e["usuario_id"] == str(self.usuario_id) for e in resposta.json()))

        sem_enderecos = self.client.get(f"{self.url}/usuario/{self.usuario_removido_id}")
        self.assertEqual(sem_enderecos.status_code, 200)
        self.assertEqual(sem_enderecos.json(), [])


if __name__ == "__main__":
    unittest.main()
