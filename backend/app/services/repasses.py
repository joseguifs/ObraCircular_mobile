"""Repasses manuais aos vendedores das vendas pagas com Pix.

O comprador paga para a conta do Mercado Pago da Obra Circular. O admin transfere
o valor líquido (total menos a taxa do marketplace) para a chave Pix do vendedor
pela própria conta e depois registra no painel que o repasse foi feito.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.anuncio import Anuncio
from app.models.enums import StatusPagamento, StatusPedido, StatusRepasse
from app.models.pagamento import Pagamento
from app.models.pedido import Pedido
from app.models.repasse import Repasse
from app.models.usuario import Usuario
from app.schemas.admin import RepasseAdminResposta

CENTAVOS = Decimal("0.01")


def calcular_valores(valor_bruto: Decimal, percentual_taxa: Decimal) -> tuple[Decimal, Decimal]:
    """Devolve a taxa do marketplace e o valor líquido do vendedor, em centavos."""

    taxa = (valor_bruto * percentual_taxa / Decimal("100")).quantize(CENTAVOS, rounding=ROUND_HALF_UP)
    return taxa, valor_bruto - taxa


def _pagamentos_confirmados():
    # Pagamento aprovado no Mercado Pago; após um reembolso ele passa a REEMBOLSADO,
    # mas o id continua útil para o admin conferir o alerta no painel.
    return (
        select(
            Pagamento.pedido_id,
            func.max(Pagamento.pagamento_externo_id).label("pagamento_externo_id"),
            func.max(Pagamento.aprovado_em).label("aprovado_em"),
        )
        .where(Pagamento.status.in_((StatusPagamento.APROVADO, StatusPagamento.REEMBOLSADO)))
        .group_by(Pagamento.pedido_id)
        .subquery()
    )


class RepasseService:
    def __init__(self, db: Session):
        self.db = db

    def _consulta(self) -> Select:
        pagamentos = _pagamentos_confirmados()
        return (
            select(
                Pedido,
                Usuario,
                Repasse,
                pagamentos.c.pagamento_externo_id,
                pagamentos.c.aprovado_em,
            )
            .join(Anuncio, Anuncio.id == Pedido.anuncio_id)
            .join(Usuario, Usuario.id == Anuncio.vendedor_id)
            .outerjoin(Repasse, Repasse.pedido_id == Pedido.id)
            .outerjoin(pagamentos, pagamentos.c.pedido_id == Pedido.id)
            # Pedidos pagos entram na fila; os já repassados continuam visíveis mesmo
            # se o pedido for reembolsado depois, para gerar o alerta.
            .where(or_(Pedido.status == StatusPedido.PAGO, Repasse.status == StatusRepasse.PAGO))
        )

    def _montar(
        self,
        pedido: Pedido,
        vendedor: Usuario,
        repasse: Repasse | None,
        pagamento_externo_id: str | None,
        aprovado_em: datetime | None,
    ) -> RepasseAdminResposta:
        if repasse is not None:
            valor_bruto, taxa, liquido = repasse.valor_bruto, repasse.taxa_marketplace, repasse.valor_liquido
        else:
            # Ainda não repassado: valores calculados com a taxa vigente.
            valor_bruto = pedido.valor_total
            taxa, liquido = calcular_valores(valor_bruto, get_settings().marketplace_fee_percent)

        repassado = repasse is not None and repasse.status == StatusRepasse.PAGO
        return RepasseAdminResposta(
            pedido_id=pedido.id,
            repasse_id=repasse.id if repasse else None,
            titulo=pedido.titulo,
            anuncio_id=pedido.anuncio_id,
            comprador_id=pedido.comprador_id,
            pedido_status=pedido.status,
            vendedor_id=vendedor.id,
            vendedor_nome=vendedor.nome,
            vendedor_email=vendedor.email,
            vendedor_telefone=vendedor.telefone,
            chave_pix=vendedor.chave_pix,
            valor_bruto=valor_bruto,
            taxa_marketplace=taxa,
            valor_liquido=liquido,
            status=StatusRepasse.PAGO if repassado else StatusRepasse.PENDENTE,
            pedido_pago_em=pedido.pago_em,
            pagamento_externo_id=pagamento_externo_id,
            pagamento_aprovado_em=aprovado_em,
            repassado_em=repasse.pago_em if repasse else None,
            observacao=repasse.observacao if repasse else None,
            admin_id=repasse.admin_id if repasse else None,
            alerta_reembolso=repassado and pedido.status == StatusPedido.REEMBOLSADO,
        )

    def listar(self, situacao: StatusRepasse | None, limite: int) -> list[RepasseAdminResposta]:
        """Vendas a repassar e já repassadas; as mais antigas primeiro."""

        consulta = self._consulta()
        if situacao == StatusRepasse.PENDENTE:
            consulta = consulta.where(
                Pedido.status == StatusPedido.PAGO,
                or_(Repasse.id.is_(None), Repasse.status == StatusRepasse.PENDENTE),
            )
        elif situacao == StatusRepasse.PAGO:
            consulta = consulta.where(Repasse.status == StatusRepasse.PAGO)

        linhas = self.db.execute(
            consulta.order_by(Pedido.pago_em.asc(), Pedido.id).limit(limite)
        ).all()
        return [self._montar(*linha) for linha in linhas]

    def obter(self, pedido_id: UUID) -> RepasseAdminResposta:
        linha = self.db.execute(self._consulta().where(Pedido.id == pedido_id)).first()
        if linha is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhuma venda paga encontrada para este pedido.",
            )
        return self._montar(*linha)

    def resumo(self) -> dict[str, int]:
        pendentes = self.db.scalar(
            select(func.count())
            .select_from(Pedido)
            .outerjoin(Repasse, Repasse.pedido_id == Pedido.id)
            .where(
                Pedido.status == StatusPedido.PAGO,
                or_(Repasse.id.is_(None), Repasse.status == StatusRepasse.PENDENTE),
            )
        )
        pagos = self.db.scalar(select(func.count()).where(Repasse.status == StatusRepasse.PAGO))
        alertas = self.db.scalar(
            select(func.count())
            .select_from(Repasse)
            .join(Pedido, Pedido.id == Repasse.pedido_id)
            .where(Repasse.status == StatusRepasse.PAGO, Pedido.status == StatusPedido.REEMBOLSADO)
        )
        return {"pendentes": pendentes or 0, "pagos": pagos or 0, "alertas": alertas or 0}

    def marcar_como_pago(self, pedido_id: UUID, admin_id: UUID, observacao: str | None) -> RepasseAdminResposta:
        """Registra que o admin já transferiu o valor líquido ao vendedor."""

        pedido = self.db.get(Pedido, pedido_id)
        if pedido is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")

        repasse = self.db.scalar(select(Repasse).where(Repasse.pedido_id == pedido_id))
        if repasse is not None and repasse.status == StatusRepasse.PAGO:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="O repasse deste pedido já foi registrado.",
            )
        if pedido.status != StatusPedido.PAGO:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Somente pedidos pagos podem ser repassados.",
            )

        vendedor = self.db.scalar(
            select(Usuario).join(Anuncio, Anuncio.vendedor_id == Usuario.id).where(Anuncio.id == pedido.anuncio_id)
        )
        if vendedor is None or not vendedor.chave_pix:
            # Sem chave o admin não tem para onde transferir.
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="O vendedor ainda não cadastrou uma chave Pix.",
            )

        taxa, liquido = calcular_valores(pedido.valor_total, get_settings().marketplace_fee_percent)
        if repasse is None:
            repasse = Repasse(id=uuid4(), pedido_id=pedido.id)
            self.db.add(repasse)
        repasse.vendedor_id = vendedor.id
        repasse.valor_bruto = pedido.valor_total
        repasse.taxa_marketplace = taxa
        repasse.valor_liquido = liquido
        repasse.status = StatusRepasse.PAGO
        repasse.pago_em = datetime.now(timezone.utc)
        repasse.observacao = observacao
        repasse.admin_id = admin_id

        try:
            self.db.commit()
        except IntegrityError:
            # Outro admin registrou o mesmo repasse ao mesmo tempo.
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="O repasse deste pedido já foi registrado.",
            ) from None
        return self.obter(pedido_id)
