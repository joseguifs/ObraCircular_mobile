"""Cria o schema inicial do Obra Circular.

Revision ID: 20260831_0001
Revises:
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260831_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "usuarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("senha_hash", sa.String(255), nullable=False),
        sa.Column("telefone", sa.String(20)),
        sa.Column("status", sa.String(20), server_default=sa.text("'ATIVO'"), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deletado_em", sa.DateTime(timezone=True)),
        sa.CheckConstraint("status IN ('ATIVO', 'INATIVO', 'BLOQUEADO')", name="ck_usuarios_status"),
        sa.PrimaryKeyConstraint("id", name="pk_usuarios"),
    )
    op.create_index("uq_usuarios_email_normalizado", "usuarios", [sa.text("lower(email)")], unique=True)
    op.create_index("ix_usuarios_status", "usuarios", ["status"])
    op.create_index("ix_usuarios_ativos", "usuarios", ["id"], postgresql_where=sa.text("deletado_em IS NULL"))

    op.create_table(
        "categorias",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("nome", sa.String(100), nullable=False),
        sa.Column("descricao", sa.String(255)),
        sa.Column("status", sa.String(20), server_default=sa.text("'ATIVA'"), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('ATIVA', 'INATIVA')", name="ck_categorias_status"),
        sa.PrimaryKeyConstraint("id", name="pk_categorias"),
    )
    op.create_index("uq_categorias_nome_normalizado", "categorias", [sa.text("lower(nome)")], unique=True)
    op.create_index("ix_categorias_status", "categorias", ["status"])

    op.create_table(
        "enderecos",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("cep", sa.String(8), nullable=False),
        sa.Column("logradouro", sa.String(150), nullable=False),
        sa.Column("numero", sa.String(20), nullable=False),
        sa.Column("complemento", sa.String(100)),
        sa.Column("bairro", sa.String(100), nullable=False),
        sa.Column("cidade", sa.String(100), nullable=False),
        sa.Column("estado", sa.String(2), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("cep ~ '^[0-9]{8}$'", name="ck_enderecos_cep"),
        sa.CheckConstraint("estado ~ '^[A-Z]{2}$'", name="ck_enderecos_estado"),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], name="fk_enderecos_usuario"),
        sa.PrimaryKeyConstraint("id", name="pk_enderecos"),
        sa.UniqueConstraint("id", "usuario_id", name="uq_enderecos_id_usuario"),
    )
    op.create_index("ix_enderecos_usuario_id", "enderecos", ["usuario_id"])
    op.create_index("ix_enderecos_localizacao", "enderecos", ["cidade", "estado", "bairro"])

    op.create_table(
        "anuncios",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("titulo", sa.String(150), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=False),
        sa.Column("categoria_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vendedor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("endereco_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("preco", sa.Numeric(12, 2), nullable=False),
        sa.Column("imagem_url", sa.Text()),
        sa.Column("quantidade", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), server_default=sa.text("'ATIVO'"), nullable=False),
        sa.Column("postado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("encerrado_em", sa.DateTime(timezone=True)),
        sa.Column("deletado_em", sa.DateTime(timezone=True)),
        sa.CheckConstraint("preco >= 0", name="ck_anuncios_preco"),
        sa.CheckConstraint("quantidade >= 0", name="ck_anuncios_quantidade"),
        sa.CheckConstraint("status IN ('ATIVO', 'ESGOTADO', 'ENCERRADO')", name="ck_anuncios_status"),
        sa.CheckConstraint("(status = 'ENCERRADO' AND encerrado_em IS NOT NULL) OR (status <> 'ENCERRADO')", name="ck_anuncios_encerrado_em"),
        sa.ForeignKeyConstraint(["categoria_id"], ["categorias.id"], name="fk_anuncios_categoria"),
        sa.ForeignKeyConstraint(["vendedor_id"], ["usuarios.id"], name="fk_anuncios_vendedor"),
        sa.ForeignKeyConstraint(["endereco_id", "vendedor_id"], ["enderecos.id", "enderecos.usuario_id"], name="fk_anuncios_endereco_vendedor"),
        sa.PrimaryKeyConstraint("id", name="pk_anuncios"),
    )
    op.create_index("ix_anuncios_categoria_id", "anuncios", ["categoria_id"])
    op.create_index("ix_anuncios_vendedor_id", "anuncios", ["vendedor_id"])
    op.create_index("ix_anuncios_endereco_id", "anuncios", ["endereco_id"])
    op.create_index("ix_anuncios_status", "anuncios", ["status"])
    op.create_index("ix_anuncios_postado_em", "anuncios", [sa.text("postado_em DESC")])
    op.create_index(
        "ix_anuncios_busca_ativos",
        "anuncios",
        ["categoria_id", sa.text("postado_em DESC")],
        postgresql_where=sa.text("status = 'ATIVO' AND deletado_em IS NULL"),
    )

    op.execute("""
        CREATE OR REPLACE FUNCTION definir_atualizado_em()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            NEW.atualizado_em = NOW();
            RETURN NEW;
        END;
        $$
    """)
    op.execute("""
        CREATE OR REPLACE FUNCTION ajustar_status_anuncio()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            IF NEW.quantidade = 0 AND NEW.status = 'ATIVO' THEN
                NEW.status = 'ESGOTADO';
            END IF;
            RETURN NEW;
        END;
        $$
    """)

    for tabela in ("usuarios", "enderecos", "categorias", "anuncios"):
        op.execute(f"""
            CREATE TRIGGER tg_{tabela}_atualizado_em
            BEFORE UPDATE ON {tabela}
            FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em()
        """)

    op.execute("""
        CREATE TRIGGER tg_anuncios_ajustar_status
        BEFORE INSERT OR UPDATE OF quantidade, status ON anuncios
        FOR EACH ROW EXECUTE FUNCTION ajustar_status_anuncio()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS tg_anuncios_ajustar_status ON anuncios")
    for tabela in ("anuncios", "categorias", "enderecos", "usuarios"):
        op.execute(f"DROP TRIGGER IF EXISTS tg_{tabela}_atualizado_em ON {tabela}")

    op.drop_table("anuncios")
    op.drop_table("enderecos")
    op.drop_table("categorias")
    op.drop_table("usuarios")

    op.execute("DROP FUNCTION IF EXISTS ajustar_status_anuncio()")
    op.execute("DROP FUNCTION IF EXISTS definir_atualizado_em()")
