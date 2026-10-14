import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.security import gerar_hash_senha
from app.db.session import get_db
from app.models.anuncio import Anuncio
from app.models.categoria import Categoria
from app.models.endereco import Endereco
from app.models.sessao_admin import SessaoAdmin
from app.models.usuario import Usuario
from app.routes.admin import router


SENHA = "Senha12345"


class AdminEndpointsTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Usuario.__table__.create(self.engine)
        Categoria.__table__.create(self.engine)
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
                    UNIQUE (id, usuario_id),
                    FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
                )
                """
            )
        Anuncio.__table__.create(self.engine)
        SessaoAdmin.__table__.create(self.engine)
        self.db = Session(self.engine)

        self.admin_id = uuid4()
        self.usuario_id = uuid4()
        self.categoria_id = uuid4()
        self.categoria_livre_id = uuid4()
        self.anuncio_id = uuid4()
        endereco_id = uuid4()
        agora = datetime.now(timezone.utc)
        self.db.add_all(
            [
                Usuario(id=self.admin_id, nome="Ana Admin", email="admin@example.com",
                        senha_hash=gerar_hash_senha(SENHA), papel="ADMIN", status="ATIVO"),
                Usuario(id=self.usuario_id, nome="Maria Silva", email="maria@example.com",
                        senha_hash=gerar_hash_senha(SENHA), papel="USUARIO", status="ATIVO"),
                Categoria(id=self.categoria_id, nome="Pisos", status="ATIVA"),
                Categoria(id=self.categoria_livre_id, nome="Telhas", status="ATIVA"),
                Endereco(id=endereco_id, usuario_id=self.usuario_id, cep="77000000",
                         logradouro="Rua Um", numero="10", bairro="Centro", cidade="Palmas",
                         estado="TO", criado_em=agora, atualizado_em=agora),
            ]
        )
        self.db.flush()
        self.db.add(
            Anuncio(id=self.anuncio_id, titulo="Sobras de piso", descricao="Caixas fechadas da reforma.",
                    categoria_id=self.categoria_id, vendedor_id=self.usuario_id,
                    endereco_id=endereco_id, preco=Decimal("100"), quantidade=3, status="ATIVO")
        )
        self.db.commit()

        app = FastAPI()
        app.include_router(router, prefix="/api/v1/admin")
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def entrar(self, email="admin@example.com") -> dict[str, str]:
        resposta = self.client.post("/api/v1/admin/login", json={"email": email, "senha": SENHA})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        return {"Authorization": f"Bearer {resposta.json()['token']}"}

    def test_login_restrito_a_administradores(self):
        resposta = self.client.post("/api/v1/admin/login", json={"email": "maria@example.com", "senha": SENHA})
        self.assertEqual(resposta.status_code, 403)
        resposta = self.client.post("/api/v1/admin/login", json={"email": "admin@example.com", "senha": "errada1"})
        self.assertEqual(resposta.status_code, 401)

        cabecalho = self.entrar()
        resposta = self.client.get("/api/v1/admin/me", headers=cabecalho)
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()["papel"], "ADMIN")

        # O token nunca é armazenado em texto puro.
        sessao = self.db.query(SessaoAdmin).one()
        self.assertNotIn(sessao.token_hash, cabecalho["Authorization"])

    def test_rotas_exigem_token_valido(self):
        for caminho in ("/me", "/resumo", "/usuarios", "/anuncios", "/categorias"):
            with self.subTest(caminho=caminho):
                self.assertEqual(self.client.get(f"/api/v1/admin{caminho}").status_code, 401)
                resposta = self.client.get(
                    f"/api/v1/admin{caminho}", headers={"Authorization": "Bearer invalido"}
                )
                self.assertEqual(resposta.status_code, 401)

    def test_logout_e_expiracao_invalidam_sessao(self):
        cabecalho = self.entrar()
        self.assertEqual(self.client.post("/api/v1/admin/logout", headers=cabecalho).status_code, 204)
        self.assertEqual(self.client.get("/api/v1/admin/me", headers=cabecalho).status_code, 401)

        cabecalho = self.entrar()
        sessao = self.db.query(SessaoAdmin).filter(SessaoAdmin.revogado_em.is_(None)).one()
        sessao.expira_em = datetime.now(timezone.utc) - timedelta(minutes=1)
        self.db.commit()
        self.assertEqual(self.client.get("/api/v1/admin/me", headers=cabecalho).status_code, 401)

    def test_admin_rebaixado_perde_acesso(self):
        cabecalho = self.entrar()
        self.db.get(Usuario, self.admin_id).papel = "USUARIO"
        self.db.commit()
        self.assertEqual(self.client.get("/api/v1/admin/me", headers=cabecalho).status_code, 403)

    def test_resumo(self):
        resposta = self.client.get("/api/v1/admin/resumo", headers=self.entrar())
        self.assertEqual(resposta.status_code, 200, resposta.text)
        resumo = resposta.json()
        self.assertEqual(resumo["usuarios"]["total"], 2)
        self.assertEqual(resumo["usuarios"]["administradores"], 1)
        self.assertEqual(resumo["anuncios"]["ativos"], 1)
        self.assertEqual(resumo["categorias"]["ativas"], 2)

    def test_gestao_de_usuarios(self):
        cabecalho = self.entrar()
        url = f"/api/v1/admin/usuarios/{self.usuario_id}"

        listagem = self.client.get("/api/v1/admin/usuarios?busca=maria", headers=cabecalho)
        self.assertEqual(listagem.status_code, 200, listagem.text)
        self.assertEqual(len(listagem.json()), 1)
        self.assertEqual(listagem.json()[0]["total_anuncios"], 1)
        self.assertNotIn("senha_hash", listagem.json()[0])

        bloqueado = self.client.patch(url, json={"status": "BLOQUEADO"}, headers=cabecalho)
        self.assertEqual(bloqueado.status_code, 200, bloqueado.text)
        self.assertEqual(bloqueado.json()["status"], "BLOQUEADO")

        promovido = self.client.patch(url, json={"papel": "ADMIN"}, headers=cabecalho)
        self.assertEqual(promovido.json()["papel"], "ADMIN")

        self.assertEqual(self.client.patch(url, json={"status": None}, headers=cabecalho).status_code, 422)
        self.assertEqual(self.client.patch(url, json={"email": "x@y.com"}, headers=cabecalho).status_code, 422)

        self.assertEqual(self.client.delete(url, headers=cabecalho).status_code, 204)
        self.assertEqual(self.client.get("/api/v1/admin/usuarios", headers=cabecalho).json()[0]["id"],
                         str(self.admin_id))
        com_excluidos = self.client.get("/api/v1/admin/usuarios?incluir_excluidos=true", headers=cabecalho)
        self.assertEqual(len(com_excluidos.json()), 2)
        self.assertEqual(self.client.patch(url, json={"status": "ATIVO"}, headers=cabecalho).status_code, 409)

        restaurado = self.client.post(f"{url}/restaurar", headers=cabecalho)
        self.assertEqual(restaurado.status_code, 200)
        self.assertIsNone(restaurado.json()["deletado_em"])

    def test_admin_nao_altera_a_propria_conta(self):
        cabecalho = self.entrar()
        url = f"/api/v1/admin/usuarios/{self.admin_id}"
        self.assertEqual(self.client.patch(url, json={"papel": "USUARIO"}, headers=cabecalho).status_code, 409)
        self.assertEqual(self.client.delete(url, headers=cabecalho).status_code, 409)

    def test_moderacao_de_anuncios(self):
        cabecalho = self.entrar()
        url = f"/api/v1/admin/anuncios/{self.anuncio_id}"

        listagem = self.client.get("/api/v1/admin/anuncios?busca=piso", headers=cabecalho)
        self.assertEqual(listagem.status_code, 200, listagem.text)
        self.assertEqual(listagem.json()[0]["vendedor_nome"], "Maria Silva")
        self.assertEqual(listagem.json()[0]["categoria_nome"], "Pisos")

        encerrado = self.client.patch(url, json={"status": "ENCERRADO"}, headers=cabecalho)
        self.assertEqual(encerrado.status_code, 200, encerrado.text)
        self.assertIsNotNone(encerrado.json()["encerrado_em"])

        reativado = self.client.patch(url, json={"status": "ATIVO"}, headers=cabecalho)
        self.assertEqual(reativado.json()["status"], "ATIVO")
        self.assertIsNone(reativado.json()["encerrado_em"])

        self.assertEqual(self.client.delete(url, headers=cabecalho).status_code, 204)
        self.assertEqual(self.client.get("/api/v1/admin/anuncios", headers=cabecalho).json(), [])
        restaurado = self.client.post(f"{url}/restaurar", headers=cabecalho)
        self.assertEqual(restaurado.status_code, 200)
        self.assertIsNone(restaurado.json()["deletado_em"])

    def test_gestao_de_categorias(self):
        cabecalho = self.entrar()

        listagem = self.client.get("/api/v1/admin/categorias", headers=cabecalho)
        self.assertEqual({c["nome"]: c["total_anuncios"] for c in listagem.json()}, {"Pisos": 1, "Telhas": 0})

        criada = self.client.post("/api/v1/admin/categorias", json={"nome": "Vidros"}, headers=cabecalho)
        self.assertEqual(criada.status_code, 201, criada.text)
        duplicada = self.client.post("/api/v1/admin/categorias", json={"nome": "pisos"}, headers=cabecalho)
        self.assertEqual(duplicada.status_code, 409)

        inativa = self.client.patch(f"/api/v1/admin/categorias/{self.categoria_id}",
                                    json={"status": "INATIVA"}, headers=cabecalho)
        self.assertEqual(inativa.status_code, 200, inativa.text)
        self.assertEqual(inativa.json()["status"], "INATIVA")
        self.assertEqual(inativa.json()["total_anuncios"], 1)

        em_uso = self.client.delete(f"/api/v1/admin/categorias/{self.categoria_id}", headers=cabecalho)
        self.assertEqual(em_uso.status_code, 409)
        livre = self.client.delete(f"/api/v1/admin/categorias/{self.categoria_livre_id}", headers=cabecalho)
        self.assertEqual(livre.status_code, 204)


if __name__ == "__main__":
    unittest.main()
