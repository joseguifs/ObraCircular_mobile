from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Index, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.anuncio import Anuncio
    from app.models.endereco import Endereco


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint(
            "status IN ('ATIVO', 'INATIVO', 'BLOQUEADO')",
            name="status",
        ),
        Index("ix_usuarios_status", "status"),
        Index(
            "ix_usuarios_ativos",
            "id",
            postgresql_where=text("deletado_em IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    telefone: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'ATIVO'")
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    deletado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    enderecos: Mapped[list[Endereco]] = relationship(back_populates="usuario")
    anuncios: Mapped[list[Anuncio]] = relationship(
        back_populates="vendedor",
        foreign_keys="Anuncio.vendedor_id",
        overlaps="endereco,anuncios",
    )


Index("uq_usuarios_email_normalizado", func.lower(Usuario.email), unique=True)
