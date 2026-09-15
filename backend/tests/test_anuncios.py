import unittest
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.session import get_db
from app.models.anuncio import Anuncio
from app.models.categoria import Categoria
from app.models.endereco import Endereco
from app.models.usuario import Usuario
from app.routes.anuncios import router


class AnunciosEndpointsTest(unittest.TestCase):
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
        self.db = Session(self.engine)

        self.vendedor_id = uuid4()
        self.outro_vendedor_id = uuid4()
        self.categoria_id = uuid4()
        self.categoria_inativa_id = uuid4()
        self.endereco_id = uuid4()
        self.outro_endereco_id = uuid4()
        agora = datetime.now(timezone.utc)

        self.db.add_all(
            [
                Usuario(
                    id=self.vendedor_id,
                    nome="Maria Silva",
                    email="maria@example.com",
                    senha_hash="hash",
                    status="ATIVO",
                ),
                Usuario(
                    id=self.outro_vendedor_id,
                    nome="João Silva",
                    email="joao@example.com",
                    senha_hash="hash",
                    status="ATIVO",
                ),
                Categoria(
                    id=self.categoria_id,
                    nome="Pisos",
                    descricao="Pisos e revestimentos",
                    status="ATIVA",
                ),
                Categoria(
                    id=self.categoria_inativa_id,
                    nome="Inativa",
                    status="INATIVA",
                ),
                Endereco(
                    id=self.endereco_id,
                    usuario_id=self.vendedor_id,
                    cep="77000000",
                    logradouro="Rua Um",
                    numero="10",
                    bairro="Centro",
                    cidade="Palmas",
                    estado="TO",
                    criado_em=agora,
                    atualizado_em=agora,
                ),
                Endereco(
                    id=self.outro_endereco_id,
                    usuario_id=self.outro_vendedor_id,
                    cep="77000001",
                    logradouro="Rua Dois",
                    numero="20",
                    bairro="Centro",
                    cidade="Palmas",
                    estado="TO",
                    criado_em=agora,
                    atualizado_em=agora,
                ),
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

    def dados_validos(self) -> dict[str, object]:
        return {
            "titulo": "  Sobras   de piso cerâmico  ",
            "descricao": "Quatro caixas fechadas que restaram da reforma.",
            "categoria_id": str(self.categoria_id),
            "vendedor_id": str(self.vendedor_id),
            "endereco_id": str(self.endereco_id),
            "preco": 120,
            "imagem_url": "https://example.com/piso.jpg",
            "quantidade": 4,
        }

    def cadastrar(self) -> dict[str, object]:
        resposta = self.client.post("/api/v1/anuncios", json=self.dados_validos())
        self.assertEqual(resposta.status_code, 201, resposta.text)
        return resposta.json()

    def test_criacao_listagem_e_detalhe(self):
        anuncio = self.cadastrar()
        self.assertEqual(anuncio["titulo"], "Sobras de piso cerâmico")
        self.assertEqual(anuncio["status"], "ATIVO")

        listagem = self.client.get("/api/v1/anuncios")
        self.assertEqual(listagem.status_code, 200)
        self.assertEqual([item["id"] for item in listagem.json()], [anuncio["id"]])

        detalhe = self.client.get(f"/api/v1/anuncios/{anuncio['id']}")
        self.assertEqual(detalhe.status_code, 200)
        self.assertEqual(detalhe.json()["descricao"], self.dados_validos()["descricao"])

    def test_edicao_estoque_e_encerramento(self):
        anuncio = self.cadastrar()
        url = f"/api/v1/anuncios/{anuncio['id']}"

        esgotado = self.client.patch(url, json={"quantidade": 0})
        self.assertEqual(esgotado.status_code, 200, esgotado.text)
        self.assertEqual(esgotado.json()["status"], "ESGOTADO")

        reativado = self.client.patch(url, json={"quantidade": 2})
        self.assertEqual(reativado.status_code, 200, reativado.text)
        self.assertEqual(reativado.json()["status"], "ATIVO")

        encerrado = self.client.patch(url, json={"status": "ENCERRADO"})
        self.assertEqual(encerrado.status_code, 200, encerrado.text)
        self.assertIsNotNone(encerrado.json()["encerrado_em"])

    def test_exclusao_logica(self):
        anuncio = self.cadastrar()
        url = f"/api/v1/anuncios/{anuncio['id']}"

        resposta = self.client.delete(url)
        self.assertEqual(resposta.status_code, 204)
        self.assertEqual(resposta.content, b"")
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.get("/api/v1/anuncios").json(), [])

        self.db.expire_all()
        registro = self.db.get(Anuncio, UUID(str(anuncio["id"])))
        self.assertIsNotNone(registro)
        self.assertIsNotNone(registro.deletado_em)

    def test_rejeita_relacionamentos_invalidos(self):
        dados = self.dados_validos()
        dados["endereco_id"] = str(self.outro_endereco_id)
        self.assertEqual(self.client.post("/api/v1/anuncios", json=dados).status_code, 400)

        dados = self.dados_validos()
        dados["categoria_id"] = str(self.categoria_inativa_id)
        self.assertEqual(self.client.post("/api/v1/anuncios", json=dados).status_code, 404)

        dados = self.dados_validos()
        dados["vendedor_id"] = str(uuid4())
        self.assertEqual(self.client.post("/api/v1/anuncios", json=dados).status_code, 404)

    def test_validacao_e_filtros(self):
        dados = self.dados_validos()
        dados.update({"titulo": "Piso", "descricao": "curta", "preco": -1})
        self.assertEqual(self.client.post("/api/v1/anuncios", json=dados).status_code, 422)

        anuncio = self.cadastrar()
        resposta = self.client.get(
            "/api/v1/anuncios",
            params={"vendedor_id": str(self.vendedor_id), "status": "ATIVO"},
        )
        self.assertEqual([item["id"] for item in resposta.json()], [anuncio["id"]])
        self.assertEqual(
            self.client.get("/api/v1/anuncios", params={"status": "ENCERRADO"}).json(),
            [],
        )


if __name__ == "__main__":
    unittest.main()
