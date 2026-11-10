"""Adiciona informações dos materiais e permite quantidades fracionadas."""
from alembic import op
import sqlalchemy as sa

revision = "20261110_0006"
down_revision = "20261110_0005"
branch_labels = None
depends_on = None


def recriar_gatilho_status() -> None:
    op.execute("""
        CREATE TRIGGER tg_anuncios_ajustar_status
        BEFORE INSERT OR UPDATE OF quantidade, status ON anuncios
        FOR EACH ROW EXECUTE FUNCTION ajustar_status_anuncio()
    """)


def upgrade() -> None:
    # O PostgreSQL bloqueia a mudança de tipo enquanto o gatilho depende da coluna.
    # A remoção e recriação acontecem na mesma transação da migration.
    op.execute("DROP TRIGGER tg_anuncios_ajustar_status ON anuncios")
    op.alter_column("anuncios", "quantidade", existing_type=sa.Integer(), type_=sa.Numeric(15, 3), existing_nullable=False)
    recriar_gatilho_status()
    op.add_column("anuncios", sa.Column("unidade", sa.String(10), nullable=False, server_default="UNIDADE"))
    op.add_column("anuncios", sa.Column("estado_conservacao", sa.String(20), nullable=False, server_default="NAO_INFORMADO"))
    op.add_column("anuncios", sa.Column("dimensoes", sa.String(200), nullable=True))
    op.add_column("anuncios", sa.Column("modalidade_entrega", sa.String(20), nullable=False, server_default="A_COMBINAR"))
    op.create_check_constraint(op.f("ck_anuncios_unidade"), "anuncios", "unidade IN ('UNIDADE', 'M2', 'M3', 'METRO', 'KG', 'LITRO', 'CAIXA', 'SACO', 'LOTE')")
    op.create_check_constraint(op.f("ck_anuncios_estado_conservacao"), "anuncios", "estado_conservacao IN ('NAO_INFORMADO', 'NOVO', 'USADO')")
    op.create_check_constraint(op.f("ck_anuncios_modalidade_entrega"), "anuncios", "modalidade_entrega IN ('A_COMBINAR', 'RETIRADA', 'ENTREGA', 'RETIRADA_ENTREGA')")


def downgrade() -> None:
    # Impede arredondar ou descartar quantidades ao voltar para o esquema antigo.
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM anuncios WHERE quantidade <> trunc(quantidade) OR quantidade > 2147483647) THEN
                RAISE EXCEPTION 'Há quantidades incompatíveis com o esquema inteiro anterior.';
            END IF;
        END $$;
    """)
    for campo in ("modalidade_entrega", "estado_conservacao", "unidade"):
        op.drop_constraint(op.f(f"ck_anuncios_{campo}"), "anuncios", type_="check")
    for campo in ("modalidade_entrega", "dimensoes", "estado_conservacao", "unidade"):
        op.drop_column("anuncios", campo)
    op.execute("DROP TRIGGER tg_anuncios_ajustar_status ON anuncios")
    op.alter_column("anuncios", "quantidade", existing_type=sa.Numeric(15, 3), type_=sa.Integer(), postgresql_using="quantidade::integer", existing_nullable=False)
    recriar_gatilho_status()
