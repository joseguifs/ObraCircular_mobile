from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

PERGUNTA_MIN = 3
PERGUNTA_MAX = 500
RESPOSTA_MAX = 1000


class AnuncioPerguntaCreate(BaseModel):
    """Pergunta enviada por um usuário ao vendedor do anúncio."""

    autor_id: UUID
    pergunta: str = Field(min_length=PERGUNTA_MIN, max_length=PERGUNTA_MAX)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class AnuncioRespostaCreate(BaseModel):
    """Resposta do vendedor para uma pergunta do anúncio."""

    vendedor_id: UUID
    resposta: str = Field(min_length=1, max_length=RESPOSTA_MAX)

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class AnuncioPerguntaResponse(BaseModel):
    """Pergunta pública retornada pela API. Quem perguntou aparece só pelo id."""

    id: UUID
    anuncio_id: UUID
    autor_id: UUID
    pergunta: str
    resposta: str | None
    criado_em: datetime
    respondido_em: datetime | None

    model_config = ConfigDict(from_attributes=True)


class AnuncioPerguntaListResponse(BaseModel):
    items: list[AnuncioPerguntaResponse]
    total: int
    offset: int
    limit: int
