"""Adiciona as categorias iniciais de anúncios.

Revision ID: 20260915_0002
Revises: 20260831_0001
"""

from collections.abc import Sequence
from uuid import UUID

from alembic import op
import sqlalchemy as sa  # pyright: ignore[reportMissingImports]


revision: str = "20260915_0002"
down_revision: str | None = "20260831_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


CATEGORIAS = (
    (UUID("10000000-0000-4000-8000-000000000001"), "Madeira", "Madeiras, tábuas e peças de marcenaria"),
    (UUID("10000000-0000-4000-8000-000000000002"), "Metais", "Perfis, ferragens e outros metais"),
    (UUID("10000000-0000-4000-8000-000000000003"), "Pisos e revestimentos", "Pisos, azulejos e revestimentos"),
    (UUID("10000000-0000-4000-8000-000000000004"), "Telhas", "Telhas e componentes de cobertura"),
    (UUID("10000000-0000-4000-8000-000000000005"), "Louças e hidráulica", "Louças, metais e materiais hidráulicos"),
    (UUID("10000000-0000-4000-8000-000000000006"), "Outros", "Outros materiais de construção"),
)


def upgrade() -> None:
    categorias = sa.table(
        "categorias",
        sa.column("id", sa.Uuid()),
        sa.column("nome", sa.String()),
        sa.column("descricao", sa.String()),
        sa.column("status", sa.String()),
    )
    op.bulk_insert(
        categorias,
        [
            {"id": categoria_id, "nome": nome, "descricao": descricao, "status": "ATIVA"}
            for categoria_id, nome, descricao in CATEGORIAS
        ],
    )


def downgrade() -> None:
    ids = ", ".join(f"'{categoria_id}'" for categoria_id, _, _ in CATEGORIAS)
    op.execute(sa.text(f"DELETE FROM categorias WHERE id IN ({ids})"))
