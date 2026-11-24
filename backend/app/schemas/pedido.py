from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CheckoutPixCreate(BaseModel):
    """Inicia a compra de um anúncio gerando uma cobrança Pix no Mercado Pago."""

    anuncio_id: UUID
    comprador_id: UUID

    model_config = ConfigDict(extra="forbid")


class CobrancaPix(BaseModel):
    """Dados para o comprador pagar em qualquer banco."""

    qr_code: str
    qr_code_base64: str | None
    ticket_url: str | None
    expira_em: datetime


class PagamentoResumo(BaseModel):
    id: UUID
    status: str
    metodo: str | None
    status_detalhe: str | None
    pagamento_externo_id: str | None
    aprovado_em: datetime | None

    model_config = ConfigDict(from_attributes=True)


class PedidoResposta(BaseModel):
    id: UUID
    anuncio_id: UUID
    comprador_id: UUID
    titulo: str
    quantidade: Decimal
    unidade: str
    valor_total: Decimal
    status: str
    criado_em: datetime
    expira_em: datetime
    pago_em: datetime | None
    cancelado_em: datetime | None
    # Presente apenas enquanto o pedido aguarda o Pix.
    pix: CobrancaPix | None = None
    pagamento: PagamentoResumo | None = None
