from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import PapelUsuario, StatusAnuncio, StatusPedido, StatusRepasse, StatusUsuario
from app.schemas.anuncio import AnuncioResponse
from app.schemas.anuncio_pergunta import AnuncioPerguntaResponse
from app.schemas.categoria import CategoriaResponse
from app.schemas.usuario import UsuarioResposta


class SessaoAdminResposta(BaseModel):
    token: str
    expira_em: datetime
    usuario: UsuarioResposta


class ResumoUsuarios(BaseModel):
    total: int
    ativos: int
    inativos: int
    bloqueados: int
    administradores: int


class ResumoAnuncios(BaseModel):
    total: int
    ativos: int
    esgotados: int
    encerrados: int
    excluidos: int


class ResumoCategorias(BaseModel):
    total: int
    ativas: int
    inativas: int


class ResumoPerguntas(BaseModel):
    total: int
    sem_resposta: int


class ResumoRepasses(BaseModel):
    pendentes: int
    pagos: int
    # Repasses já feitos cujo pedido foi reembolsado depois.
    alertas: int


class ResumoAdmin(BaseModel):
    usuarios: ResumoUsuarios
    anuncios: ResumoAnuncios
    categorias: ResumoCategorias
    perguntas: ResumoPerguntas
    repasses: ResumoRepasses


class UsuarioAdminResposta(UsuarioResposta):
    deletado_em: datetime | None = None
    total_anuncios: int = 0


class UsuarioAdminAtualizacao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: StatusUsuario | None = None
    papel: PapelUsuario | None = None

    @model_validator(mode="before")
    @classmethod
    def rejeitar_nulos(cls, dados: object) -> object:
        if isinstance(dados, dict):
            for campo in ("status", "papel"):
                if campo in dados and dados[campo] is None:
                    raise ValueError(f"o campo {campo} não pode ser nulo")
        return dados


class AnuncioAdminResposta(AnuncioResponse):
    deletado_em: datetime | None = None
    vendedor_nome: str
    categoria_nome: str


class AnuncioAdminAtualizacao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: StatusAnuncio


class CategoriaAdminResposta(CategoriaResponse):
    total_anuncios: int = 0


class PerguntaAdminResposta(AnuncioPerguntaResponse):
    anuncio_titulo: str
    autor_nome: str
    vendedor_nome: str


class RepasseAdminResposta(BaseModel):
    """Venda paga com Pix e a situação do repasse ao vendedor."""

    pedido_id: uuid.UUID
    # Nulo enquanto o repasse ainda não foi registrado.
    repasse_id: uuid.UUID | None
    titulo: str
    anuncio_id: uuid.UUID
    comprador_id: uuid.UUID
    pedido_status: StatusPedido
    vendedor_id: uuid.UUID
    vendedor_nome: str
    vendedor_email: str
    vendedor_telefone: str | None
    chave_pix: str | None
    valor_bruto: Decimal
    taxa_marketplace: Decimal
    valor_liquido: Decimal
    status: StatusRepasse
    # Data em que o comprador pagou o pedido.
    pedido_pago_em: datetime | None
    # Id do pagamento no Mercado Pago, para conferir no painel.
    pagamento_externo_id: str | None
    pagamento_aprovado_em: datetime | None
    # Data em que o admin marcou o repasse como feito.
    repassado_em: datetime | None
    observacao: str | None
    admin_id: uuid.UUID | None
    # O valor já saiu da conta, mas o pedido foi reembolsado ao comprador depois.
    alerta_reembolso: bool


class RepasseAdminPagamento(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observacao: str | None = Field(
        default=None,
        max_length=255,
        description="Ex.: identificador do comprovante da transferência",
    )

    @field_validator("observacao", mode="before")
    @classmethod
    def normalizar_observacao(cls, observacao: object) -> object:
        if isinstance(observacao, str):
            return observacao.strip() or None
        return observacao
