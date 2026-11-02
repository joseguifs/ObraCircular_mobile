"""Cria a tabela de perguntas e respostas dos anúncios.

Revision ID: 20261027_0004
Revises: 20260922_0003
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa # pyright: ignore[reportMissingImports]
from sqlalchemy.dialects import postgresql # pyright: ignore[reportMissingImports]


revision: str = "20261027_0004"
down_revision: str | None = "20260922_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "anuncio_perguntas",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("anuncio_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("autor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("pergunta", sa.Text(), nullable=False),
        sa.Column("resposta", sa.Text()),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("respondido_em", sa.DateTime(timezone=True)),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "length(trim(pergunta)) BETWEEN 3 AND 500",
            name="ck_anuncio_perguntas_pergunta",
        ),
        sa.CheckConstraint(
            "resposta IS NULL OR length(trim(resposta)) BETWEEN 1 AND 1000",
            name="ck_anuncio_perguntas_resposta",
        ),
        sa.CheckConstraint(
            "(resposta IS NULL AND respondido_em IS NULL) "
            "OR (resposta IS NOT NULL AND respondido_em IS NOT NULL)",
            name="ck_anuncio_perguntas_respondido_em",
        ),
        sa.ForeignKeyConstraint(
            ["anuncio_id"],
            ["anuncios.id"],
            name="fk_anuncio_perguntas_anuncio",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["autor_id"], ["usuarios.id"], name="fk_anuncio_perguntas_autor"),
        sa.PrimaryKeyConstraint("id", name="pk_anuncio_perguntas"),
    )
    op.create_index(
        "ix_anuncio_perguntas_anuncio_criado_em",
        "anuncio_perguntas",
        ["anuncio_id", sa.text("criado_em DESC")],
    )
    op.create_index("ix_anuncio_perguntas_autor_id", "anuncio_perguntas", ["autor_id"])

    op.execute("""
        CREATE TRIGGER tg_anuncio_perguntas_atualizado_em
        BEFORE UPDATE ON anuncio_perguntas
        FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS tg_anuncio_perguntas_atualizado_em ON anuncio_perguntas")
    op.drop_index("ix_anuncio_perguntas_autor_id", table_name="anuncio_perguntas")
    op.drop_index("ix_anuncio_perguntas_anuncio_criado_em", table_name="anuncio_perguntas")
    op.drop_table("anuncio_perguntas")
