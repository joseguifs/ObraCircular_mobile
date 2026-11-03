import unittest
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.security import gerar_hash_senha
from app.db.session import get_db
from app.models.usuario import Usuario
from app.routes.auth import router


class AuthEndpointsTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Usuario.__table__.create(self.engine)
        self.db = Session(self.engine)
        self.senha = "SenhaForte123"
        self.db.add_all([
            Usuario(id=uuid4(), nome="Maria Silva", email="maria@example.com",
                    senha_hash=gerar_hash_senha(self.senha)),
            Usuario(id=uuid4(), nome="Conta Bloqueada", email="bloqueada@example.com",
                    senha_hash=gerar_hash_senha(self.senha), status="BLOQUEADO"),
            Usuario(id=uuid4(), nome="Conta Excluída", email="excluida@example.com",
                    senha_hash=gerar_hash_senha(self.senha), deletado_em=func_now()),
        ])
        self.db.commit()
        app = FastAPI()
        app.include_router(router, prefix="/api/v1/auth")
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def test_login_com_credenciais_corretas(self):
        resposta = self.client.post("/api/v1/auth/login", json={
            "email": "MARIA@example.com", "senha": self.senha,
        })
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()["email"], "maria@example.com")
        self.assertNotIn("senha_hash", resposta.json())

    def test_login_com_senha_incorreta(self):
        resposta = self.client.post("/api/v1/auth/login", json={
            "email": "maria@example.com", "senha": "SenhaErrada123",
        })
        self.assertEqual(resposta.status_code, 401)

    def test_login_com_email_inexistente(self):
        resposta = self.client.post("/api/v1/auth/login", json={
            "email": "ninguem@example.com", "senha": self.senha,
        })
        self.assertEqual(resposta.status_code, 401)

    def test_login_com_conta_bloqueada(self):
        resposta = self.client.post("/api/v1/auth/login", json={
            "email": "bloqueada@example.com", "senha": self.senha,
        })
        self.assertEqual(resposta.status_code, 403)

    def test_login_com_conta_excluida(self):
        resposta = self.client.post("/api/v1/auth/login", json={
            "email": "excluida@example.com", "senha": self.senha,
        })
        self.assertEqual(resposta.status_code, 401)

    def test_login_com_dados_invalidos(self):
        for dados in ({"email": "invalido", "senha": self.senha}, {"email": "maria@example.com", "senha": ""}):
            with self.subTest(dados=dados):
                self.assertEqual(self.client.post("/api/v1/auth/login", json=dados).status_code, 422)


def func_now():
    from datetime import datetime, timezone

    return datetime.now(timezone.utc)


if __name__ == "__main__":
    unittest.main()
