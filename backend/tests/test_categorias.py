import unittest
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.session import get_db
from app.models.anuncio import Anuncio
from app.models.categoria import Categoria
from app.routes.categorias import router


class CategoriasEndpointsTest(unittest.TestCase):
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

        Categoria.__table__.create(self.engine)
        # A exclusão consulta os anúncios da categoria, então a tabela precisa existir.
        Anuncio.__table__.create(self.engine)
        self.db = Session(self.engine)
        self.telhas_id = uuid4()
        self.db.add_all([
            Categoria(id=self.telhas_id, nome="Telhas", descricao="Cerâmica, fibrocimento e metálica"),
            Categoria(id=uuid4(), nome="Madeira"),
            Categoria(id=uuid4(), nome="Pisos e revestimentos"),
        ])
        self.db.commit()

        app = FastAPI()
        app.include_router(router, prefix="/api/v1/categorias")
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)
        self.url = "/api/v1/categorias"

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def test_lista_categorias_em_ordem_alfabetica(self):
        resposta = self.client.get(self.url)
        self.assertEqual(resposta.status_code, 200)
        nomes = [categoria["nome"] for categoria in resposta.json()]
        self.assertEqual(nomes, ["Madeira", "Pisos e revestimentos", "Telhas"])
        self.assertTrue(all(categoria["status"] == "ATIVA" for categoria in resposta.json()))

    def test_consulta_por_id(self):
        resposta = self.client.get(f"{self.url}/{self.telhas_id}")
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()["nome"], "Telhas")
        self.assertEqual(resposta.json()["descricao"], "Cerâmica, fibrocimento e metálica")

        self.assertEqual(self.client.get(f"{self.url}/{uuid4()}").status_code, 404)
        self.assertEqual(self.client.get(f"{self.url}/nao-e-uuid").status_code, 422)

    def test_cria_categoria(self):
        resposta = self.client.post(self.url, json={
            "nome": "Tintas",
            "descricao": "Látex, esmalte e acrílica",
        })
        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.json()["nome"], "Tintas")
        self.assertEqual(resposta.json()["status"], "ATIVA")
        self.assertEqual(len(self.client.get(self.url).json()), 4)

    def test_bloqueia_nome_duplicado_ignorando_maiusculas(self):
        for nome in ["Telhas", "telhas", "TELHAS"]:
            resposta = self.client.post(self.url, json={"nome": nome})
            self.assertEqual(resposta.status_code, 409, nome)
            self.assertEqual(resposta.json()["detail"], "Categoria já cadastrada.")

    def test_valida_campos_obrigatorios(self):
        self.assertEqual(self.client.post(self.url, json={}).status_code, 422)
        self.assertEqual(self.client.post(self.url, json={"nome": ""}).status_code, 422)
        self.assertEqual(self.client.post(self.url, json={"nome": "x" * 101}).status_code, 422)

    def test_edita_categoria(self):
        resposta = self.client.put(f"{self.url}/{self.telhas_id}", json={
            "descricao": "Somente telhas cerâmicas",
            "status": "INATIVA",
        })
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()["nome"], "Telhas")
        self.assertEqual(resposta.json()["descricao"], "Somente telhas cerâmicas")
        self.assertEqual(resposta.json()["status"], "INATIVA")

    def test_edicao_nao_permite_nome_de_outra_categoria(self):
        resposta = self.client.put(f"{self.url}/{self.telhas_id}", json={"nome": "madeira"})
        self.assertEqual(resposta.status_code, 409)

        # Manter o próprio nome não é conflito.
        resposta = self.client.put(f"{self.url}/{self.telhas_id}", json={"nome": "Telhas"})
        self.assertEqual(resposta.status_code, 200)

    def test_edicao_de_categoria_inexistente(self):
        resposta = self.client.put(f"{self.url}/{uuid4()}", json={"nome": "Qualquer"})
        self.assertEqual(resposta.status_code, 404)

    def test_exclui_categoria(self):
        resposta = self.client.delete(f"{self.url}/{self.telhas_id}")
        self.assertEqual(resposta.status_code, 204)
        self.assertEqual(self.client.get(f"{self.url}/{self.telhas_id}").status_code, 404)
        self.assertEqual(self.client.delete(f"{self.url}/{self.telhas_id}").status_code, 404)

    def test_nao_exclui_categoria_com_anuncios(self):
        self.db.add(Anuncio(
            id=uuid4(),
            titulo="Telhas coloniais que sobraram da reforma",
            descricao="Cerca de 40 telhas em bom estado.",
            categoria_id=self.telhas_id,
            vendedor_id=uuid4(),
            endereco_id=uuid4(),
            preco=80,
            quantidade=40,
        ))
        self.db.commit()

        resposta = self.client.delete(f"{self.url}/{self.telhas_id}")
        self.assertEqual(resposta.status_code, 409)
        self.assertEqual(
            resposta.json()["detail"],
            "Não é possível excluir uma categoria vinculada a anúncios.",
        )
        self.assertEqual(self.client.get(f"{self.url}/{self.telhas_id}").status_code, 200)


if __name__ == "__main__":
    unittest.main()
