"""Cria pedidos e pagamentos via Pix (QR code) no Mercado Pago."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261124_0007"
down_revision = "20261110_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pedidos",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("comprador_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("anuncio_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("titulo", sa.String(150), nullable=False),
        sa.Column("quantidade", sa.Numeric(15, 3), nullable=False),
        sa.Column("unidade", sa.String(10), nullable=False),
        sa.Column("valor_total", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(30), server_default=sa.text("'AGUARDANDO_PAGAMENTO'"), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expira_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("pago_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelado_em", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("valor_total > 0", name=op.f("ck_pedidos_valor_total")),
        sa.CheckConstraint("quantidade > 0", name=op.f("ck_pedidos_quantidade")),
        sa.CheckConstraint(
            "status IN ('AGUARDANDO_PAGAMENTO', 'PAGO', 'CANCELADO', 'EXPIRADO', 'REEMBOLSADO')",
            name=op.f("ck_pedidos_status"),
        ),
        sa.ForeignKeyConstraint(["comprador_id"], ["usuarios.id"], name="fk_pedidos_comprador"),
        sa.ForeignKeyConstraint(["anuncio_id"], ["anuncios.id"], name="fk_pedidos_anuncio"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pedidos")),
    )
    op.create_index("ix_pedidos_comprador_id", "pedidos", ["comprador_id"])
    op.create_index("ix_pedidos_anuncio_id", "pedidos", ["anuncio_id"])
    op.create_index(
        "uq_pedidos_anuncio_ativo",
        "pedidos",
        ["anuncio_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('AGUARDANDO_PAGAMENTO', 'PAGO')"),
    )

    op.create_table(
        "pagamentos",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("pedido_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provedor", sa.String(30), server_default=sa.text("'MERCADO_PAGO'"), nullable=False),
        sa.Column("pagamento_externo_id", sa.String(255), nullable=True),
        sa.Column("qr_code", sa.Text(), nullable=True),
        sa.Column("qr_code_base64", sa.Text(), nullable=True),
        sa.Column("ticket_url", sa.Text(), nullable=True),
        sa.Column("metodo", sa.String(30), nullable=True),
        sa.Column("valor", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(30), server_default=sa.text("'CRIADO'"), nullable=False),
        sa.Column("status_detalhe", sa.String(100), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("aprovado_em", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("provedor IN ('MERCADO_PAGO')", name=op.f("ck_pagamentos_provedor")),
        sa.CheckConstraint("valor > 0", name=op.f("ck_pagamentos_valor")),
        sa.CheckConstraint(
            "metodo IS NULL OR metodo IN "
            "('PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'BOLETO', 'SALDO_MERCADO_PAGO', 'OUTRO')",
            name=op.f("ck_pagamentos_metodo"),
        ),
        sa.CheckConstraint(
            "status IN ('CRIADO', 'PENDENTE', 'EM_PROCESSAMENTO', 'APROVADO', "
            "'RECUSADO', 'CANCELADO', 'REEMBOLSADO')",
            name=op.f("ck_pagamentos_status"),
        ),
        sa.ForeignKeyConstraint(["pedido_id"], ["pedidos.id"], name="fk_pagamentos_pedido"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pagamentos")),
        sa.UniqueConstraint("pagamento_externo_id", name=op.f("uq_pagamentos_pagamento_externo_id")),
    )
    op.create_index("ix_pagamentos_pedido_id", "pagamentos", ["pedido_id"])

    for tabela in ("pedidos", "pagamentos"):
        op.execute(f"""
            CREATE TRIGGER tg_{tabela}_atualizado_em
            BEFORE UPDATE ON {tabela}
            FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em()
        """)


def downgrade() -> None:
    for tabela in ("pagamentos", "pedidos"):
        op.execute(f"DROP TRIGGER IF EXISTS tg_{tabela}_atualizado_em ON {tabela}")
    op.drop_index("ix_pagamentos_pedido_id", table_name="pagamentos")
    op.drop_table("pagamentos")
    op.drop_index("uq_pedidos_anuncio_ativo", table_name="pedidos")
    op.drop_index("ix_pedidos_anuncio_id", table_name="pedidos")
    op.drop_index("ix_pedidos_comprador_id", table_name="pedidos")
    op.drop_table("pedidos")
