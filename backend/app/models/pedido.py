from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Um anúncio só pode ter um pedido reservado (aguardando Pix) ou pago por vez.
PEDIDO_ATIVO = "status IN ('AGUARDANDO_PAGAMENTO', 'PAGO')"


class Pedido(Base):
    """Compra do lote anunciado, paga com Pix (QR code) pelo Mercado Pago."""

    __tablename__ = "pedidos"
    __table_args__ = (
        CheckConstraint("valor_total > 0", name="valor_total"),
        CheckConstraint("quantidade > 0", name="quantidade"),
        CheckConstraint(
            "status IN ('AGUARDANDO_PAGAMENTO', 'PAGO', 'CANCELADO', 'EXPIRADO', 'REEMBOLSADO')",
            name="status",
        ),
        Index("ix_pedidos_comprador_id", "comprador_id"),
        Index("ix_pedidos_anuncio_id", "anuncio_id"),
        Index(
            "uq_pedidos_anuncio_ativo",
            "anuncio_id",
            unique=True,
            postgresql_where=text(PEDIDO_ATIVO),
            sqlite_where=text(PEDIDO_ATIVO),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    comprador_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", name="fk_pedidos_comprador"),
        nullable=False,
    )
    anuncio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("anuncios.id", name="fk_pedidos_anuncio"),
        nullable=False,
    )
    # Cópia dos dados do anúncio no momento da compra.
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    quantidade: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    unidade: Mapped[str] = mapped_column(String(10), nullable=False)
    valor_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, server_default=text("'AGUARDANDO_PAGAMENTO'")
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    # Fim da reserva do anúncio; o Pix gerado vence no mesmo instante.
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    pago_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
