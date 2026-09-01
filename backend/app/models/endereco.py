from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.anuncio import Anuncio
    from app.models.usuario import Usuario


class Endereco(Base):
    __tablename__ = "enderecos"
    __table_args__ = (
        UniqueConstraint("id", "usuario_id", name="uq_enderecos_id_usuario"),
        CheckConstraint("cep ~ '^[0-9]{8}$'", name="cep"),
        CheckConstraint("estado ~ '^[A-Z]{2}$'", name="estado"),
        Index("ix_enderecos_usuario_id", "usuario_id"),
        Index("ix_enderecos_localizacao", "cidade", "estado", "bairro"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", name="fk_enderecos_usuario"),
        nullable=False,
    )
    cep: Mapped[str] = mapped_column(String(8), nullable=False)
    logradouro: Mapped[str] = mapped_column(String(150), nullable=False)
    numero: Mapped[str] = mapped_column(String(20), nullable=False)
    complemento: Mapped[str | None] = mapped_column(String(100))
    bairro: Mapped[str] = mapped_column(String(100), nullable=False)
    cidade: Mapped[str] = mapped_column(String(100), nullable=False)
    estado: Mapped[str] = mapped_column(String(2), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    usuario: Mapped[Usuario] = relationship(back_populates="enderecos")
    anuncios: Mapped[list[Anuncio]] = relationship(
        back_populates="endereco",
        foreign_keys="[Anuncio.endereco_id, Anuncio.vendedor_id]",
        overlaps="anuncios,vendedor",
    )
