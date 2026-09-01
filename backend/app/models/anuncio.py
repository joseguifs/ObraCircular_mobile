from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.categoria import Categoria
    from app.models.endereco import Endereco
    from app.models.usuario import Usuario


class Anuncio(Base):
    __tablename__ = "anuncios"
    __table_args__ = (
        ForeignKeyConstraint(
            ["endereco_id", "vendedor_id"],
            ["enderecos.id", "enderecos.usuario_id"],
            name="fk_anuncios_endereco_vendedor",
        ),
        CheckConstraint("preco >= 0", name="preco"),
        CheckConstraint("quantidade >= 0", name="quantidade"),
        CheckConstraint(
            "status IN ('ATIVO', 'ESGOTADO', 'ENCERRADO')",
            name="status",
        ),
        CheckConstraint(
            "(status = 'ENCERRADO' AND encerrado_em IS NOT NULL) "
            "OR (status <> 'ENCERRADO')",
            name="encerrado_em",
        ),
        Index("ix_anuncios_categoria_id", "categoria_id"),
        Index("ix_anuncios_vendedor_id", "vendedor_id"),
        Index("ix_anuncios_endereco_id", "endereco_id"),
        Index("ix_anuncios_status", "status"),
        Index("ix_anuncios_postado_em", text("postado_em DESC")),
        Index(
            "ix_anuncios_busca_ativos",
            "categoria_id",
            text("postado_em DESC"),
            postgresql_where=text("status = 'ATIVO' AND deletado_em IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    categoria_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categorias.id", name="fk_anuncios_categoria"),
        nullable=False,
    )
    vendedor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", name="fk_anuncios_vendedor"),
        nullable=False,
    )
    endereco_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    preco: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    imagem_url: Mapped[str | None] = mapped_column(Text)
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'ATIVO'")
    )
    postado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    encerrado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deletado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    categoria: Mapped[Categoria] = relationship(back_populates="anuncios")
    vendedor: Mapped[Usuario] = relationship(
        back_populates="anuncios",
        foreign_keys=[vendedor_id],
        overlaps="anuncios,endereco",
    )
    endereco: Mapped[Endereco] = relationship(
        back_populates="anuncios",
        foreign_keys=[endereco_id, vendedor_id],
        overlaps="anuncios,vendedor",
    )
