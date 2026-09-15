from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import StatusAnuncio


class AnuncioBase(BaseModel):
    titulo: str = Field(min_length=5, max_length=150)
    descricao: str = Field(min_length=20, max_length=5000)
    categoria_id: UUID
    endereco_id: UUID
    preco: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    imagem_url: str | None = Field(default=None, max_length=2048)
    quantidade: int = Field(ge=0)

    model_config = ConfigDict(extra="forbid")

    @field_validator("titulo", "descricao", mode="before")
    @classmethod
    def normalizar_texto(cls, valor: object) -> object:
        if isinstance(valor, str):
            return " ".join(valor.split())
        return valor

    @field_validator("imagem_url", mode="before")
    @classmethod
    def normalizar_imagem_url(cls, valor: object) -> object:
        if valor is None or valor == "":
            return None
        if isinstance(valor, str):
            valor = valor.strip()
            if not valor.lower().startswith(("http://", "https://")):
                raise ValueError("a URL da imagem deve começar com http:// ou https://")
        return valor


class AnuncioCreate(AnuncioBase):
    vendedor_id: UUID


class AnuncioUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=5, max_length=150)
    descricao: str | None = Field(default=None, min_length=20, max_length=5000)
    categoria_id: UUID | None = None
    endereco_id: UUID | None = None
    preco: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    imagem_url: str | None = Field(default=None, max_length=2048)
    quantidade: int | None = Field(default=None, ge=0)
    status: StatusAnuncio | None = None

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="before")
    @classmethod
    def rejeitar_nulos_obrigatorios(cls, dados: object) -> object:
        if isinstance(dados, dict):
            for campo in (
                "titulo",
                "descricao",
                "categoria_id",
                "endereco_id",
                "preco",
                "quantidade",
                "status",
            ):
                if campo in dados and dados[campo] is None:
                    raise ValueError(f"o campo {campo} não pode ser nulo")
        return dados

    @field_validator("titulo", "descricao", mode="before")
    @classmethod
    def normalizar_texto(cls, valor: object) -> object:
        if isinstance(valor, str):
            return " ".join(valor.split())
        return valor

    @field_validator("imagem_url", mode="before")
    @classmethod
    def normalizar_imagem_url(cls, valor: object) -> object:
        if valor is None or valor == "":
            return None
        if isinstance(valor, str):
            valor = valor.strip()
            if not valor.lower().startswith(("http://", "https://")):
                raise ValueError("a URL da imagem deve começar com http:// ou https://")
        return valor


class AnuncioResponse(BaseModel):
    """Dados de um anúncio retornados pela API."""

    id: UUID
    titulo: str
    descricao: str
    categoria_id: UUID
    vendedor_id: UUID
    endereco_id: UUID
    preco: Decimal
    imagem_url: str | None
    quantidade: int
    status: StatusAnuncio
    postado_em: datetime
    atualizado_em: datetime
    encerrado_em: datetime | None

    model_config = ConfigDict(from_attributes=True)
