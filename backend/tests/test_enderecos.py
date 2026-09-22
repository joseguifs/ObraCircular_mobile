import unittest
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
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
        Usuario.__table__.create(self.engine)
        with self.engine.begin() as conexao:
            conexao.exec_driver_sql(
                """
                CREATE TABLE enderecos (
                    id UUID PRIMARY KEY,
                    usuario_id UUID NOT NULL,
                    cep VARCHAR(8) NOT NULL,
                    logradouro VARCHAR(150) NOT NULL,
                    numero VARCHAR(20) NOT NULL,
                    complemento VARCHAR(100),
                    bairro VARCHAR(100) NOT NULL,
                    cidade VARCHAR(100) NOT NULL,
                    estado VARCHAR(2) NOT NULL,
                    criado_em DATETIME NOT NULL,
                    atualizado_em DATETIME NOT NULL,
                    FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
                )
                """
            )

        self.db = Session(self.engine)
        self.usuario_id = uuid4()
        self.endereco_id = uuid4()
        agora = datetime.now(timezone.utc)
        self.db.add(
            Usuario(
                id=self.usuario_id,
                nome="Maria Silva",
                email="maria@example.com",
                senha_hash="hash",
            )
        )
        self.db.add(
            Endereco(
                id=self.endereco_id,
                usuario_id=self.usuario_id,
                cep="77000000",
                logradouro="Rua Um",
                numero="10",
                bairro="Centro",
                cidade="Palmas",
                estado="TO",
                criado_em=agora,
                atualizado_em=agora,
            )
        )
        self.db.commit()

        app = FastAPI()
        app.include_router(router, prefix="/api/v1/enderecos")
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)
        self.url = f"/api/v1/enderecos/{self.endereco_id}"

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def test_edita_endereco_e_normaliza_dados(self):
        resposta = self.client.patch(
            self.url,
            json={
                "cep": "77001-234",
                "logradouro": "  Avenida Central  ",
                "numero": " 42 ",
                "complemento": "  Sala 2  ",
                "bairro": "  Plano Diretor  ",
                "cidade": "  Palmas  ",
                "estado": "to",
            },
        )

        self.assertEqual(resposta.status_code, 200, resposta.text)
        corpo = resposta.json()
        self.assertEqual(corpo["cep"], "77001234")
        self.assertEqual(corpo["logradouro"], "Avenida Central")
        self.assertEqual(corpo["numero"], "42")
        self.assertEqual(corpo["complemento"], "Sala 2")
        self.assertEqual(corpo["bairro"], "Plano Diretor")
        self.assertEqual(corpo["cidade"], "Palmas")
        self.assertEqual(corpo["estado"], "TO")
        self.assertEqual(corpo["usuario_id"], str(self.usuario_id))

    def test_edicao_parcial_preserva_demais_campos(self):
        resposta = self.client.patch(self.url, json={"numero": "25", "complemento": None})

        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(resposta.json()["numero"], "25")
        self.assertIsNone(resposta.json()["complemento"])
        self.assertEqual(resposta.json()["logradouro"], "Rua Um")

    def test_rejeita_campos_invalidos(self):
        for dados in (
            {"cep": "123"},
            {"estado": "XX"},
            {"cidade": None},
            {"usuario_id": str(uuid4())},
        ):
            with self.subTest(dados=dados):
                self.assertEqual(self.client.patch(self.url, json=dados).status_code, 422)

    def test_endereco_inexistente(self):
        self.assertEqual(
            self.client.patch(f"/api/v1/enderecos/{uuid4()}", json={"numero": "1"}).status_code,
            404,
        )


if __name__ == "__main__":
    unittest.main()
