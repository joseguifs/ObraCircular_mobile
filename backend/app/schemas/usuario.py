from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UsuarioCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    email: str = Field(min_length=5, max_length=255)
    senha: str = Field(min_length=8, max_length=128)
    telefone: str | None = Field(default=None, max_length=20)


class UsuarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nome: str
    email: str
    telefone: str | None
    status: str
    criado_em: datetime
    atualizado_em: datetime
