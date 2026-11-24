import unittest
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
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

        @event.listens_for(self.engine, "connect")
        def registrar_funcoes(conexao, _):
            conexao.create_function("gen_random_uuid", 0, lambda: uuid4().hex)

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

    def test_imagem_ciclo_e_atomicidade(self):
        import base64
        from io import BytesIO
        from PIL import Image
        arquivo = BytesIO()
        Image.new("RGB", (800, 600), "blue").save(arquivo, "PNG")
        imagem = "data:image/png;base64," + base64.b64encode(arquivo.getvalue()).decode()
        self.assertEqual(self.client.patch(self.url, json={"email": "outro@example.com", "imagem_url": imagem}).status_code, 409)
        self.assertIsNone(self.client.get(self.url).json()["imagem_url"])
        resposta = self.client.patch(self.url, json={"imagem_url": imagem})
        self.assertEqual(resposta.status_code, 200)
        salva = resposta.json()["imagem_url"]
        with Image.open(BytesIO(base64.b64decode(salva.split(",")[1]))) as foto:
            self.assertEqual(foto.size, (512, 384))
        self.client.patch(self.url, json={"nome": "Maria Foto"})
        self.assertEqual(self.client.get(self.url).json()["imagem_url"], salva)
        self.assertIsNone(self.client.patch(self.url, json={"imagem_url": None}).json()["imagem_url"])

    def test_imagem_invalida_nao_altera_dados(self):
        for imagem in ("https://example.com/foto.jpg", "data:image/png;base64,abc!",
                       "data:image/png;base64,YWJj", "data:image/svg+xml;base64,YWJj",
                       "data:image/png;base64," + "A" * 7_000_000):
            with self.subTest(tamanho=len(imagem)):
                resposta = self.client.patch(self.url, json={"nome": "Nome Modificado", "imagem_url": imagem})
                self.assertEqual(resposta.status_code, 422)
        self.assertEqual(self.client.get(self.url).json()["nome"], "Maria Silva")

    def test_cadastro_e_troca_da_chave_pix(self):
        resposta = self.client.patch(self.url, json={
            "chave_pix_tipo": "CPF", "chave_pix": "529.982.247-25",
        })
        self.assertEqual(resposta.status_code, 200, resposta.text)
        corpo = resposta.json()
        self.assertEqual(corpo["chave_pix_tipo"], "CPF")
        # A chave completa não é exposta pela API.
        self.assertEqual(corpo["chave_pix_mascarada"], "***.982.247-**")
        self.assertNotIn("chave_pix", corpo)
        self.db.expire_all()
        self.assertEqual(self.db.get(Usuario, self.usuario_id).chave_pix, "52998224725")

        resposta = self.client.patch(self.url, json={
            "chave_pix_tipo": "EMAIL", "chave_pix": "  Maria.Pix@Example.com ",
        })
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(resposta.json()["chave_pix_mascarada"], "ma*******@example.com")
        self.db.expire_all()
        self.assertEqual(self.db.get(Usuario, self.usuario_id).chave_pix, "maria.pix@example.com")

    def test_rejeita_chave_pix_invalida(self):
        invalidos = [
            {"chave_pix_tipo": "CPF", "chave_pix": "123.456.789-00"},
            {"chave_pix_tipo": "CPF", "chave_pix": "111.111.111-11"},
            {"chave_pix_tipo": "EMAIL", "chave_pix": "sem-arroba"},
            {"chave_pix_tipo": "TELEFONE", "chave_pix": "63999999999"},
            {"chave_pix": "maria@example.com"},
            {"chave_pix_tipo": None, "chave_pix": None},
        ]
        for dados in invalidos:
            with self.subTest(dados=dados):
                self.assertEqual(self.client.patch(self.url, json=dados).status_code, 422)

    def test_cadastro_sem_chave_pix_e_chave_opcional(self):
        sem_chave = self.client.post("/api/v1/usuarios", json={
            "nome": "Bruna Lima", "email": "bruna@example.com", "senha": "Senha1234",
        })
        self.assertEqual(sem_chave.status_code, 201, sem_chave.text)
        self.assertIsNone(sem_chave.json()["chave_pix_tipo"])
        self.assertIsNone(sem_chave.json()["chave_pix_mascarada"])

        dados = {"nome": "Carlos Lima", "email": "carlos@example.com", "senha": "Senha1234",
                 "chave_pix_tipo": "EMAIL", "chave_pix": "carlos@example.com"}
        resposta = self.client.post("/api/v1/usuarios", json=dados)
        self.assertEqual(resposta.status_code, 201, resposta.text)
        self.assertEqual(resposta.json()["chave_pix_tipo"], "EMAIL")
        self.assertEqual(resposta.json()["chave_pix_mascarada"], "ca****@example.com")


if __name__ == "__main__":
    unittest.main()
