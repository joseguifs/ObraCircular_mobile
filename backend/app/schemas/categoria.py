from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import StatusCategoria


class CategoriaResponse(BaseModel):
    id: UUID
    nome: str
    descricao: str | None
    status: StatusCategoria
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)
