from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Repasse(Base):
    """Transferência manual ao vendedor do valor de um pedido pago com Pix.

    O dinheiro entra na conta do Mercado Pago da Obra Circular; o admin faz a
    transferência para a chave Pix do vendedor e registra aqui que ela foi feita.
    """

    __tablename__ = "repasses"
    __table_args__ = (
        CheckConstraint("valor_bruto > 0", name="valor_bruto"),
        CheckConstraint("taxa_marketplace >= 0", name="taxa_marketplace"),
        CheckConstraint("valor_liquido >= 0", name="valor_liquido"),
        CheckConstraint("status IN ('PENDENTE', 'PAGO')", name="status"),
        # Um repasse marcado como feito precisa da data da transferência.
        CheckConstraint("status <> 'PAGO' OR pago_em IS NOT NULL", name="pago_em"),
        Index("ix_repasses_vendedor_id", "vendedor_id"),
        Index("ix_repasses_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    # Um repasse por pedido.
    pedido_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pedidos.id", name="fk_repasses_pedido"),
        nullable=False,
        unique=True,
    )
    vendedor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", name="fk_repasses_vendedor"),
        nullable=False,
    )
    # Valores gravados no momento do repasse: mudar a taxa depois não altera o histórico.
    valor_bruto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    taxa_marketplace: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    valor_liquido: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'PENDENTE'"))
    pago_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Ex.: identificador do comprovante da transferência.
    observacao: Mapped[str | None] = mapped_column(String(255))
    # Administrador que marcou o repasse como feito.
    admin_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", name="fk_repasses_admin"),
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
