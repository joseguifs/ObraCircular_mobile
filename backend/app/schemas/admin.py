from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.enums import PapelUsuario, StatusAnuncio, StatusUsuario
from app.schemas.anuncio import AnuncioResponse
from app.schemas.categoria import CategoriaResponse
from app.schemas.usuario import UsuarioResposta


class SessaoAdminResposta(BaseModel):
    token: str
    expira_em: datetime
    usuario: UsuarioResposta


class ResumoUsuarios(BaseModel):
    total: int
    ativos: int
    inativos: int
    bloqueados: int
    administradores: int


class ResumoAnuncios(BaseModel):
    total: int
    ativos: int
    esgotados: int
    encerrados: int
    excluidos: int


class ResumoCategorias(BaseModel):
    total: int
    ativas: int
    inativas: int


class ResumoAdmin(BaseModel):
    usuarios: ResumoUsuarios
    anuncios: ResumoAnuncios
    categorias: ResumoCategorias


class UsuarioAdminResposta(UsuarioResposta):
    deletado_em: datetime | None = None
    total_anuncios: int = 0


class UsuarioAdminAtualizacao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: StatusUsuario | None = None
    papel: PapelUsuario | None = None

    @model_validator(mode="before")
    @classmethod
    def rejeitar_nulos(cls, dados: object) -> object:
        if isinstance(dados, dict):
            for campo in ("status", "papel"):
                if campo in dados and dados[campo] is None:
                    raise ValueError(f"o campo {campo} não pode ser nulo")
        return dados


class AnuncioAdminResposta(AnuncioResponse):
    deletado_em: datetime | None = None
    vendedor_nome: str
    categoria_nome: str


class AnuncioAdminAtualizacao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: StatusAnuncio


class CategoriaAdminResposta(CategoriaResponse):
    total_anuncios: int = 0
