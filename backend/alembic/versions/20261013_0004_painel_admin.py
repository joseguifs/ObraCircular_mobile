"""Adiciona papel de usuário e sessões do painel administrativo.

Revision ID: 20261013_0004
Revises: 20260922_0003
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa  # pyright: ignore[reportMissingImports]
from sqlalchemy.dialects import postgresql  # pyright: ignore[reportMissingImports]


revision: str = "20261013_0004"
down_revision: str | None = "20260922_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("papel", sa.String(20), server_default=sa.text("'USUARIO'"), nullable=False),
    )
    op.create_check_constraint(op.f("ck_usuarios_papel"), "usuarios", "papel IN ('USUARIO', 'ADMIN')")

    op.create_table(
        "sessoes_admin",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expira_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revogado_em", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], name="fk_sessoes_admin_usuario"),
        sa.PrimaryKeyConstraint("id", name="pk_sessoes_admin"),
    )
    op.create_index("uq_sessoes_admin_token_hash", "sessoes_admin", ["token_hash"], unique=True)
    op.create_index("ix_sessoes_admin_usuario_id", "sessoes_admin", ["usuario_id"])


def downgrade() -> None:
    op.drop_table("sessoes_admin")
    op.drop_constraint(op.f("ck_usuarios_papel"), "usuarios", type_="check")
    op.drop_column("usuarios", "papel")
