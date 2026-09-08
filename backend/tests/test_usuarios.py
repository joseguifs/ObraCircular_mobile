import unittest
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.session import get_db
from app.models.usuario import Usuario
from app.routes.usuarios import router


class UsuariosEndpointsTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Usuario.__table__.create(self.engine)
        self.db = Session(self.engine)
        self.usuario_id = uuid4()
        self.db.add_all([
            Usuario(id=self.usuario_id, nome="Maria Silva", email="maria@example.com",
                    senha_hash="hash-original", telefone="+5563999999999"),
            Usuario(id=uuid4(), nome="Outro Usuário", email="outro@example.com",
                    senha_hash="outro-hash"),
        ])
        self.db.commit()
        app = FastAPI()
        app.include_router(router, prefix="/api/v1/usuarios")
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)
        self.url = f"/api/v1/usuarios/{self.usuario_id}"

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def test_consulta_e_validacao_uuid(self):
        resposta = self.client.get(self.url)
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()["id"], str(self.usuario_id))
        self.assertNotIn("senha_hash", resposta.json())
        self.assertEqual(self.client.get("/api/v1/usuarios/invalido").status_code, 422)
        self.assertEqual(self.client.get(f"/api/v1/usuarios/{uuid4()}").status_code, 404)

    def test_edicao_parcial_e_senha(self):
        resposta = self.client.patch(self.url, json={
            "nome": "  Maria   Souza  ", "telefone": None, "senha": "NovaSenha123",
        })
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()["nome"], "Maria Souza")
        self.assertEqual(resposta.json()["email"], "maria@example.com")
        self.assertIsNone(resposta.json()["telefone"])
        usuario = self.db.get(Usuario, self.usuario_id)
        self.assertTrue(usuario.senha_hash.startswith("scrypt$"))
        self.assertNotIn("senha", resposta.json())

    def test_email_normalizado_e_conflito(self):
        resposta = self.client.patch(self.url, json={"email": " MARIA@example.com "})
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()["email"], "maria@example.com")
        resposta = self.client.patch(self.url, json={"email": "OUTRO@example.com"})
        self.assertEqual(resposta.status_code, 409)
        self.assertEqual(self.client.get(self.url).json()["email"], "maria@example.com")

    def test_campos_invalidos(self):
        for dados in ({"nome": None}, {"email": None}, {"senha": None},
                      {"status": None}, {"senha": "semdigitos"}, {"nome": " "},
                      {"telefone": "123"}, {"status": "INVALIDO"},
                      {"deletado_em": None}):
            with self.subTest(dados=dados):
                self.assertEqual(self.client.patch(self.url, json=dados).status_code, 422)

    def test_exclusao_logica_preserva_registro(self):
        resposta = self.client.delete(self.url)
        self.assertEqual(resposta.status_code, 204)
        self.assertEqual(resposta.content, b"")
        self.db.expire_all()
        usuario = self.db.get(Usuario, self.usuario_id)
        self.assertIsNotNone(usuario)
        self.assertIsNotNone(usuario.deletado_em)
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.client.patch(self.url, json={"nome": "Novo Nome"}).status_code, 404)
        self.assertEqual(self.client.delete(self.url).status_code, 404)
        usuarios = self.client.get("/api/v1/usuarios").json()
        self.assertNotIn(str(self.usuario_id), [item["id"] for item in usuarios])


if __name__ == "__main__":
    unittest.main()
