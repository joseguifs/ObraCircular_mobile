from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AnuncioResponse(BaseModel):
    """Dados de um anuncio retornados pela API."""

    id: UUID
    titulo: str
    descricao: str
    categoria_id: UUID
    vendedor_id: UUID
    endereco_id: UUID
    preco: Decimal
    imagem_url: str | None
    quantidade: int
    status: str
    postado_em: datetime
    atualizado_em: datetime
    encerrado_em: datetime | None

    model_config = ConfigDict(from_attributes=True)
