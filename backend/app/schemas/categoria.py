from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CategoriaCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    descricao: str | None = Field(default=None, max_length=255)


class CategoriaUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=100)
    descricao: str | None = Field(default=None, max_length=255)
    status: Literal["ATIVA", "INATIVA"] | None = None


class CategoriaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nome: str
    descricao: str | None
    status: Literal["ATIVA", "INATIVA"]
    criado_em: datetime
    atualizado_em: datetime
