"""Adiciona imagem de perfil opcional ao usuário."""
from alembic import op
import sqlalchemy as sa

revision = "20260922_0003"
down_revision = "20260915_0002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("usuarios", sa.Column("imagem_url", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("usuarios", "imagem_url")
