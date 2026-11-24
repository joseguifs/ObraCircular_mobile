"""Cria os repasses manuais aos vendedores e a chave Pix do usuário."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261124_0008"
down_revision = "20261124_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Destino das transferências feitas pelo admin; e-mail é o tipo de chave mais longo (77).
    op.add_column("usuarios", sa.Column("chave_pix", sa.String(77), nullable=True))

    op.create_table(
        "repasses",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("pedido_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vendedor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("valor_bruto", sa.Numeric(12, 2), nullable=False),
        sa.Column("taxa_marketplace", sa.Numeric(12, 2), nullable=False),
        sa.Column("valor_liquido", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(20), server_default=sa.text("'PENDENTE'"), nullable=False),
        sa.Column("pago_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("observacao", sa.String(255), nullable=True),
        sa.Column("admin_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("valor_bruto > 0", name=op.f("ck_repasses_valor_bruto")),
        sa.CheckConstraint("taxa_marketplace >= 0", name=op.f("ck_repasses_taxa_marketplace")),
        sa.CheckConstraint("valor_liquido >= 0", name=op.f("ck_repasses_valor_liquido")),
        sa.CheckConstraint("status IN ('PENDENTE', 'PAGO')", name=op.f("ck_repasses_status")),
        sa.CheckConstraint("status <> 'PAGO' OR pago_em IS NOT NULL", name=op.f("ck_repasses_pago_em")),
        sa.ForeignKeyConstraint(["pedido_id"], ["pedidos.id"], name="fk_repasses_pedido"),
        sa.ForeignKeyConstraint(["vendedor_id"], ["usuarios.id"], name="fk_repasses_vendedor"),
        sa.ForeignKeyConstraint(["admin_id"], ["usuarios.id"], name="fk_repasses_admin"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_repasses")),
        sa.UniqueConstraint("pedido_id", name=op.f("uq_repasses_pedido_id")),
    )
    op.create_index("ix_repasses_vendedor_id", "repasses", ["vendedor_id"])
    op.create_index("ix_repasses_status", "repasses", ["status"])
    op.execute("""
        CREATE TRIGGER tg_repasses_atualizado_em
        BEFORE UPDATE ON repasses
        FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS tg_repasses_atualizado_em ON repasses")
    op.drop_index("ix_repasses_status", table_name="repasses")
    op.drop_index("ix_repasses_vendedor_id", table_name="repasses")
    op.drop_table("repasses")
    op.drop_column("usuarios", "chave_pix")
