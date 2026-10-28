from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AnuncioPergunta(Base):
    """Pergunta pública feita por um usuário ao vendedor de um anúncio."""

    __tablename__ = "anuncio_perguntas"
    __table_args__ = (
        CheckConstraint(
            "length(trim(pergunta)) BETWEEN 3 AND 500",
            name="pergunta",
        ),
        CheckConstraint(
            "resposta IS NULL OR length(trim(resposta)) BETWEEN 1 AND 1000",
            name="resposta",
        ),
        CheckConstraint(
            "(resposta IS NULL AND respondido_em IS NULL) "
            "OR (resposta IS NOT NULL AND respondido_em IS NOT NULL)",
            name="respondido_em",
        ),
        Index(
            "ix_anuncio_perguntas_anuncio_criado_em",
            "anuncio_id",
            text("criado_em DESC"),
        ),
        Index("ix_anuncio_perguntas_autor_id", "autor_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    anuncio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("anuncios.id", name="fk_anuncio_perguntas_anuncio", ondelete="CASCADE"),
        nullable=False,
    )
    autor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", name="fk_anuncio_perguntas_autor"),
        nullable=False,
    )
    pergunta: Mapped[str] = mapped_column(Text, nullable=False)
    resposta: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    respondido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
