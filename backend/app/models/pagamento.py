from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Pagamento(Base):
    """Cobrança Pix de um pedido gerada na API de pagamentos do Mercado Pago."""

    __tablename__ = "pagamentos"
    __table_args__ = (
        CheckConstraint("provedor IN ('MERCADO_PAGO')", name="provedor"),
        CheckConstraint("valor > 0", name="valor"),
        CheckConstraint(
            "metodo IS NULL OR metodo IN "
            "('PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'BOLETO', 'SALDO_MERCADO_PAGO', 'OUTRO')",
            name="metodo",
        ),
        CheckConstraint(
            "status IN ('CRIADO', 'PENDENTE', 'EM_PROCESSAMENTO', 'APROVADO', "
            "'RECUSADO', 'CANCELADO', 'REEMBOLSADO')",
            name="status",
        ),
        Index("ix_pagamentos_pedido_id", "pedido_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    pedido_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pedidos.id", name="fk_pagamentos_pedido"),
        nullable=False,
    )
    provedor: Mapped[str] = mapped_column(String(30), nullable=False, server_default=text("'MERCADO_PAGO'"))
    pagamento_externo_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    # Código "copia e cola", imagem PNG em base64 e página do Pix devolvidos pelo Mercado Pago.
    qr_code: Mapped[str | None] = mapped_column(Text)
    qr_code_base64: Mapped[str | None] = mapped_column(Text)
    ticket_url: Mapped[str | None] = mapped_column(Text)
    metodo: Mapped[str | None] = mapped_column(String(30))
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, server_default=text("'CRIADO'"))
    status_detalhe: Mapped[str | None] = mapped_column(String(100))
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    aprovado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
