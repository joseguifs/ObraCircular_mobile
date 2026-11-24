"""Adiciona a chave Pix (e-mail ou CPF) do usuário para receber o valor das vendas."""
from alembic import op
import sqlalchemy as sa

revision = "20261124_0008"
down_revision = "20261124_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("usuarios", sa.Column("chave_pix_tipo", sa.String(10), nullable=True))
    op.add_column("usuarios", sa.Column("chave_pix", sa.String(77), nullable=True))
    op.create_check_constraint(
        op.f("ck_usuarios_chave_pix"),
        "usuarios",
        "(chave_pix_tipo IS NULL AND chave_pix IS NULL) OR "
        "(chave_pix_tipo IN ('EMAIL', 'CPF') AND chave_pix IS NOT NULL)",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_usuarios_chave_pix"), "usuarios", type_="check")
    op.drop_column("usuarios", "chave_pix")
    op.drop_column("usuarios", "chave_pix_tipo")
