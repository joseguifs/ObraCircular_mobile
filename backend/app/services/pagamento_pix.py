"""Compra de anúncios com Pix (QR code e copia e cola) pela API do Mercado Pago.

O backend cria o pedido, reserva o anúncio e gera uma cobrança Pix em
/v1/payments. O comprador paga em qualquer banco, sem sair do app. A
confirmação vem do webhook assinado (ou de uma sincronização sob demanda),
sempre consultando o pagamento na API do Mercado Pago.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.integrations.mercado_pago import MercadoPagoErro, MercadoPagoGateway, validar_assinatura_webhook
from app.models.anuncio import Anuncio
from app.models.enums import MetodoPagamento, StatusAnuncio, StatusPagamento, StatusPedido, StatusUsuario
from app.models.pagamento import Pagamento
from app.models.pedido import Pedido
from app.models.usuario import Usuario
from app.schemas.pedido import CheckoutPixCreate, CobrancaPix, PagamentoResumo, PedidoResposta

logger = logging.getLogger(__name__)

CENTAVOS = Decimal("0.01")
CAMINHO_WEBHOOK = "/api/v1/webhooks/mercado-pago"
# O Mercado Pago exige que o Pix vença em pelo menos 30 minutos; a folga cobre a latência.
MINUTOS_MINIMOS_PIX = 31
STATUS_FINAIS_PAGAMENTO = {StatusPagamento.APROVADO, StatusPagamento.REEMBOLSADO}
STATUS_INUTILIZAVEIS = STATUS_FINAIS_PAGAMENTO | {StatusPagamento.CANCELADO, StatusPagamento.RECUSADO}
MENSAGEM_RESERVADO = "Outro comprador está finalizando o pagamento deste anúncio. Tente novamente mais tarde."


def _agora() -> datetime:
    return datetime.now(timezone.utc)


def _com_fuso(valor: datetime) -> datetime:
    # O SQLite dos testes devolve datas sem fuso; o PostgreSQL devolve em UTC.
    return valor if valor.tzinfo else valor.replace(tzinfo=timezone.utc)


def _data_mp(valor: datetime) -> str:
    # Formato documentado: yyyy-MM-ddTHH:mm:ss.SSS±hh:mm
    return valor.astimezone(timezone.utc).isoformat(timespec="milliseconds")


def _erro(codigo: int, mensagem: str) -> HTTPException:
    return HTTPException(status_code=codigo, detail=mensagem)


class PagamentoPixService:
    def __init__(
        self,
        db: Session,
        *,
        settings: Settings | None = None,
        gateway: MercadoPagoGateway | None = None,
    ) -> None:
        self.db = db
        self.settings = settings or get_settings()
        self._gateway = gateway

    # ------------------------------------------------------------------ checkout

    def criar_checkout(self, dados: CheckoutPixCreate) -> PedidoResposta:
        gateway = self.gateway
        agora = _agora()

        comprador = self.db.scalar(
            select(Usuario).where(
                Usuario.id == dados.comprador_id,
                Usuario.status == StatusUsuario.ATIVO,
                Usuario.deletado_em.is_(None),
            )
        )
        if comprador is None:
            raise _erro(status.HTTP_403_FORBIDDEN, "Sua conta precisa estar ativa para comprar.")

        anuncio = self.db.scalar(select(Anuncio).where(Anuncio.id == dados.anuncio_id).with_for_update())
        if anuncio is None or anuncio.deletado_em is not None:
            raise _erro(status.HTTP_404_NOT_FOUND, "Anúncio não encontrado.")
        if anuncio.vendedor_id == comprador.id:
            raise _erro(status.HTTP_409_CONFLICT, "Você não pode comprar o próprio anúncio.")

        self._expirar_reservas(anuncio.id, agora)
        ativo = self.db.scalar(
            select(Pedido).where(
                Pedido.anuncio_id == anuncio.id,
                Pedido.status.in_((StatusPedido.AGUARDANDO_PAGAMENTO, StatusPedido.PAGO)),
            )
        )
        if ativo is not None:
            if ativo.comprador_id == comprador.id and ativo.status == StatusPedido.AGUARDANDO_PAGAMENTO:
                pagamento_ativo = self._ultimo_pagamento(ativo.id)
                if pagamento_ativo and pagamento_ativo.qr_code and pagamento_ativo.status not in STATUS_INUTILIZAVEIS:
                    # Reaproveita o Pix ainda válido (ex.: o comprador saiu da tela).
                    self.db.commit()
                    return self._resposta(ativo)
                # O Pix anterior não pode mais ser pago: libera a reserva para gerar outro.
                self._cancelar(ativo, agora)
                self.db.flush()
            else:
                self.db.rollback()
                if ativo.status == StatusPedido.PAGO:
                    raise _erro(status.HTTP_409_CONFLICT, "Este anúncio já foi vendido.")
                raise _erro(status.HTTP_409_CONFLICT, MENSAGEM_RESERVADO)

        if anuncio.status != StatusAnuncio.ATIVO or anuncio.quantidade <= 0:
            self.db.rollback()
            raise _erro(status.HTTP_409_CONFLICT, "Este anúncio não está disponível para compra.")
        valor_total = Decimal(anuncio.preco).quantize(CENTAVOS)
        if valor_total <= 0:
            self.db.rollback()
            raise _erro(status.HTTP_409_CONFLICT, "Anúncios de doação não utilizam pagamento. Combine com o vendedor.")
        # Sem chave Pix não há como repassar o valor ao vendedor (anúncios anteriores à exigência).
        chave_vendedor = self.db.scalar(select(Usuario.chave_pix).where(Usuario.id == anuncio.vendedor_id))
        if not chave_vendedor:
            self.db.rollback()
            raise _erro(
                status.HTTP_409_CONFLICT,
                "O vendedor ainda não cadastrou a chave Pix para receber. Tente novamente mais tarde.",
            )

        minutos = max(self.settings.mp_checkout_minutes, MINUTOS_MINIMOS_PIX)
        pedido = Pedido(
            comprador_id=comprador.id,
            anuncio_id=anuncio.id,
            titulo=anuncio.titulo,
            quantidade=anuncio.quantidade,
            unidade=anuncio.unidade,
            valor_total=valor_total,
            status=StatusPedido.AGUARDANDO_PAGAMENTO,
            # Segundos inteiros: o Pix e a reserva vencem exatamente no mesmo instante.
            expira_em=(agora + timedelta(minutes=minutos)).replace(microsecond=0),
        )
        self.db.add(pedido)
        try:
            self.db.flush()
            pagamento = Pagamento(pedido_id=pedido.id, valor=valor_total, status=StatusPagamento.CRIADO)
            self.db.add(pagamento)
            self.db.flush()
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise _erro(status.HTTP_409_CONFLICT, MENSAGEM_RESERVADO) from exc

        payload = self._payload_pix(pedido=pedido, pagamento=pagamento, anuncio=anuncio, comprador=comprador)
        try:
            resposta = gateway.criar_pagamento(payload, idempotency_key=str(pagamento.id))
            transacao = (resposta.get("point_of_interaction") or {}).get("transaction_data") or {}
            qr_code = transacao.get("qr_code")
            if resposta.get("id") is None or not isinstance(qr_code, str) or not qr_code:
                raise KeyError(f"qr_code ausente (status={resposta.get('status')}, detalhe={resposta.get('status_detail')})")
        except (MercadoPagoErro, KeyError, AttributeError) as exc:
            self._registrar_falha(exc)
            self._cancelar(pedido, _agora())
            self.db.commit()
            if isinstance(exc, MercadoPagoErro) and exc.status_code == 401:
                raise _erro(
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    "A credencial do Mercado Pago da Obra Circular foi recusada.",
                ) from exc
            if isinstance(exc, MercadoPagoErro) and exc.status_code in {400, 403}:
                raise _erro(
                    status.HTTP_502_BAD_GATEWAY,
                    "O Mercado Pago recusou a cobrança Pix. Verifique se a conta recebedora tem chave Pix cadastrada.",
                ) from exc
            raise _erro(status.HTTP_502_BAD_GATEWAY, "Não foi possível gerar o Pix no Mercado Pago.") from exc

        pagamento.pagamento_externo_id = str(resposta["id"])
        pagamento.qr_code = qr_code
        pagamento.qr_code_base64 = transacao.get("qr_code_base64") or None
        pagamento.ticket_url = transacao.get("ticket_url") or None
        pagamento.metodo = MetodoPagamento.PIX
        pagamento.status = StatusPagamento.PENDENTE
        detalhe = resposta.get("status_detail")
        pagamento.status_detalhe = str(detalhe)[:100] if detalhe is not None else None
        self.db.commit()
        return self._resposta(pedido)

    def _payload_pix(self, *, pedido: Pedido, pagamento: Pagamento, anuncio: Anuncio, comprador: Usuario) -> dict[str, Any]:
        partes_nome = comprador.nome.strip().split(maxsplit=1)
        email = comprador.email
        if not self.settings.mp_live_mode and self.settings.mp_test_payer_email:
            email = self.settings.mp_test_payer_email
        payer: dict[str, Any] = {"email": email}
        if partes_nome:
            payer["first_name"] = partes_nome[0]
        if len(partes_nome) > 1:
            payer["last_name"] = partes_nome[1]

        payload: dict[str, Any] = {
            "transaction_amount": float(pedido.valor_total),
            "description": f"Obra Circular - {anuncio.titulo}"[:250],
            "payment_method_id": "pix",
            "external_reference": str(pedido.id),
            "date_of_expiration": _data_mp(_com_fuso(pedido.expira_em)),
            "payer": payer,
            "metadata": {"pedido_id": str(pedido.id), "pagamento_id": str(pagamento.id)},
            "additional_info": {
                "items": [
                    {
                        "id": str(anuncio.id),
                        "title": anuncio.titulo[:256],
                        "description": anuncio.descricao[:256],
                        "category_id": "home",
                        "quantity": 1,
                        "unit_price": float(pedido.valor_total),
                    }
                ]
            },
        }
        url_notificacao = self._url_notificacao()
        if url_notificacao:
            payload["notification_url"] = url_notificacao
        return payload

    # --------------------------------------------------------------- consultas

    def listar_pedidos(self, comprador_id: UUID) -> list[PedidoResposta]:
        """Pedidos do comprador, do mais recente para o mais antigo."""
        pedidos = self.db.scalars(
            select(Pedido)
            .where(Pedido.comprador_id == comprador_id)
            .order_by(Pedido.criado_em.desc(), Pedido.id.desc())
            .execution_options(populate_existing=True)
        ).all()
        agora = _agora()
        vencidos = [
            p for p in pedidos
            if p.status == StatusPedido.AGUARDANDO_PAGAMENTO and _com_fuso(p.expira_em) <= agora
        ]
        for pedido in vencidos:
            self._cancelar(pedido, agora, status_pedido=StatusPedido.EXPIRADO)
        if vencidos:
            self.db.commit()
        return [self._resposta(pedido) for pedido in pedidos]

    def obter_pedido(self, pedido_id: UUID, comprador_id: UUID) -> PedidoResposta:
        pedido = self._pedido_do_comprador(pedido_id, comprador_id)
        self._expirar_se_vencido(pedido)
        return self._resposta(pedido)

    def sincronizar(self, pedido_id: UUID, comprador_id: UUID) -> PedidoResposta:
        """Consulta o Mercado Pago pelo pedido, útil quando o webhook ainda não chegou."""
        pedido = self._pedido_do_comprador(pedido_id, comprador_id)
        if pedido.status in (StatusPedido.AGUARDANDO_PAGAMENTO, StatusPedido.EXPIRADO, StatusPedido.CANCELADO):
            try:
                pagamentos_mp = self.gateway.buscar_pagamentos(str(pedido.id))
            except MercadoPagoErro as exc:
                logger.warning("Falha ao sincronizar pedido %s com o Mercado Pago: %s", pedido.id, exc)
                pagamentos_mp = []
            # Do mais antigo para o mais recente, para que o último estado prevaleça.
            for dados in reversed(pagamentos_mp):
                self._aplicar_pagamento(dados)
            pedido = self._pedido_do_comprador(pedido_id, comprador_id)
        self._expirar_se_vencido(pedido)
        return self._resposta(pedido)

    # ----------------------------------------------------------------- webhook

    def processar_webhook(
        self,
        *,
        tipo: str | None,
        data_id: str | None,
        x_signature: str | None,
        x_request_id: str | None,
        payload: dict[str, Any],
    ) -> None:
        segredos = self.settings.mp_webhook_secrets
        if not segredos:
            raise _erro(status.HTTP_503_SERVICE_UNAVAILABLE, "O segredo do webhook não foi configurado.")
        if not data_id:
            # Notificações sem data.id (formato IPN antigo) não são assinadas: ignoradas.
            return
        if not x_signature or not x_request_id:
            raise _erro(status.HTTP_401_UNAUTHORIZED, "Cabeçalhos de assinatura do webhook ausentes.")
        if not any(
            validar_assinatura_webhook(
                x_signature=x_signature, x_request_id=x_request_id, data_id=data_id, secret=segredo
            )
            for segredo in segredos
        ):
            raise _erro(status.HTTP_401_UNAUTHORIZED, "Assinatura do webhook inválida.")

        tipo = tipo or str(payload.get("type") or "")
        if tipo != "payment":
            return
        dados_corpo = payload.get("data")
        corpo_id = str(dados_corpo.get("id", "")) if isinstance(dados_corpo, dict) else ""
        if corpo_id and corpo_id.lower() != data_id.lower():
            raise _erro(status.HTTP_400_BAD_REQUEST, "Identificador do webhook inconsistente.")

        try:
            dados = self.gateway.obter_pagamento(data_id)
        except MercadoPagoErro as exc:
            if exc.status_code == 404:
                logger.warning("Pagamento %s do webhook não encontrado no Mercado Pago.", data_id)
                return
            # Erro temporário: responder com falha para o Mercado Pago reenviar.
            raise _erro(status.HTTP_502_BAD_GATEWAY, "Falha ao consultar o pagamento no Mercado Pago.") from exc
        self._aplicar_pagamento(dados)

    # ------------------------------------------------------- conciliação

    def _aplicar_pagamento(self, dados: dict[str, Any]) -> None:
        try:
            pedido_id = UUID(str(dados.get("external_reference")))
        except ValueError:
            logger.info("Pagamento %s sem pedido da Obra Circular: ignorado.", dados.get("id"))
            return
        externo_id = str(dados.get("id")) if dados.get("id") is not None else None
        if externo_id is None:
            return

        pedido = self.db.scalar(select(Pedido).where(Pedido.id == pedido_id).with_for_update())
        if pedido is None:
            logger.warning("Pedido %s do pagamento %s não encontrado.", pedido_id, externo_id)
            self.db.rollback()
            return
        pagamento = self._pagamento_do_evento(pedido.id, externo_id, dados)
        if pagamento is None:
            logger.warning("Pagamento %s não corresponde a nenhuma cobrança do pedido %s.", externo_id, pedido.id)
            self.db.rollback()
            return

        valor = Decimal(str(dados.get("transaction_amount") or "0")).quantize(CENTAVOS)
        if valor != pedido.valor_total:
            logger.error(
                "Valor do pagamento %s (%s) difere do pedido %s (%s): ignorado.",
                externo_id, valor, pedido.id, pedido.valor_total,
            )
            self.db.rollback()
            return
        if self.settings.mp_live_mode and not dados.get("live_mode"):
            logger.error("Pagamento %s de teste recebido em modo produtivo: ignorado.", externo_id)
            self.db.rollback()
            return

        anuncio = self.db.scalar(select(Anuncio).where(Anuncio.id == pedido.anuncio_id).with_for_update())
        agora = _agora()
        status_mp = str(dados.get("status") or "")
        detalhe = dados.get("status_detail")
        final = pagamento.status in STATUS_FINAIS_PAGAMENTO

        pagamento.pagamento_externo_id = externo_id
        pagamento.metodo = self._mapear_metodo(dados)
        pagamento.status_detalhe = str(detalhe)[:100] if detalhe is not None else None

        reembolsar = False
        if status_mp == "approved":
            reembolsar = self._aprovar(pedido, pagamento, anuncio, agora)
        elif status_mp in {"pending", "authorized", "in_process"} and not final:
            pagamento.status = (
                StatusPagamento.EM_PROCESSAMENTO if status_mp == "in_process" else StatusPagamento.PENDENTE
            )
        elif status_mp == "rejected" and not final:
            pagamento.status = StatusPagamento.RECUSADO
        elif status_mp == "cancelled" and not final:
            pagamento.status = StatusPagamento.CANCELADO
            if pedido.status == StatusPedido.AGUARDANDO_PAGAMENTO:
                pedido.status = StatusPedido.EXPIRADO if detalhe == "expired" else StatusPedido.CANCELADO
                pedido.cancelado_em = agora
        elif status_mp in {"refunded", "charged_back"}:
            self._marcar_reembolso(pedido, pagamento, anuncio, agora)
        self.db.commit()

        if reembolsar:
            self._reembolsar_pagamento_tardio(pedido.id, pagamento.id, externo_id)

    def _aprovar(self, pedido: Pedido, pagamento: Pagamento, anuncio: Anuncio | None, agora: datetime) -> bool:
        """Confirma a venda. Retorna True quando o Pix chegou tarde demais e precisa ser devolvido."""
        if pagamento.status == StatusPagamento.REEMBOLSADO or pedido.status == StatusPedido.REEMBOLSADO:
            return False
        pagamento.status = StatusPagamento.APROVADO
        pagamento.aprovado_em = pagamento.aprovado_em or agora
        if pedido.status == StatusPedido.PAGO:
            return False

        disponivel = pedido.status == StatusPedido.AGUARDANDO_PAGAMENTO
        if not disponivel and anuncio is not None:
            # Pix aprovado depois de a reserva expirar: aproveita se o anúncio ainda está livre.
            outro_ativo = self.db.scalar(
                select(Pedido.id).where(
                    Pedido.anuncio_id == pedido.anuncio_id,
                    Pedido.id != pedido.id,
                    Pedido.status.in_((StatusPedido.AGUARDANDO_PAGAMENTO, StatusPedido.PAGO)),
                )
            )
            disponivel = (
                outro_ativo is None
                and anuncio.deletado_em is None
                and anuncio.status == StatusAnuncio.ATIVO
                and anuncio.quantidade > 0
            )
        if not disponivel or anuncio is None:
            logger.warning("Pix do pedido %s aprovado sem reserva válida: será devolvido.", pedido.id)
            return True

        pedido.status = StatusPedido.PAGO
        pedido.pago_em = agora
        pedido.cancelado_em = None
        # O preço anunciado corresponde ao lote inteiro: a compra esgota o anúncio.
        anuncio.quantidade = Decimal("0")
        anuncio.status = StatusAnuncio.ESGOTADO
        return False

    def _marcar_reembolso(self, pedido: Pedido, pagamento: Pagamento, anuncio: Anuncio | None, agora: datetime) -> None:
        estava_pago = pedido.status == StatusPedido.PAGO
        pagamento.status = StatusPagamento.REEMBOLSADO
        pedido.status = StatusPedido.REEMBOLSADO
        pedido.cancelado_em = pedido.cancelado_em or agora
        if estava_pago and anuncio is not None and anuncio.deletado_em is None:
            # Devolve o lote à vitrine.
            anuncio.quantidade = pedido.quantidade
            if anuncio.status == StatusAnuncio.ESGOTADO:
                anuncio.status = StatusAnuncio.ATIVO

    def _reembolsar_pagamento_tardio(self, pedido_id: UUID, pagamento_id: UUID, externo_id: str) -> None:
        try:
            self.gateway.reembolsar_pagamento(externo_id, idempotency_key=f"reembolso-{pagamento_id}")
        except MercadoPagoErro as exc:
            logger.error("Falha ao devolver o Pix tardio %s do pedido %s: %s", externo_id, pedido_id, exc)
            raise _erro(
                status.HTTP_502_BAD_GATEWAY, "Pagamento tardio registrado; a devolução precisa de nova tentativa."
            ) from exc
        pedido = self.db.get(Pedido, pedido_id)
        pagamento = self.db.get(Pagamento, pagamento_id)
        if pedido is not None and pagamento is not None:
            self._marcar_reembolso(pedido, pagamento, None, _agora())
            self.db.commit()

    # ----------------------------------------------------------- auxiliares

    @property
    def gateway(self) -> MercadoPagoGateway:
        if self._gateway is None:
            if self.settings.mp_access_token is None:
                raise _erro(
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    "O pagamento com Pix ainda não foi configurado (MP_ACCESS_TOKEN).",
                )
            self._gateway = MercadoPagoGateway(
                self.settings.mp_access_token.get_secret_value(), api_url=self.settings.mercado_pago_api_url
            )
        return self._gateway

    def _url_notificacao(self) -> str | None:
        url = self.settings.mp_webhook_url
        if not url and self.settings.mp_public_base_url:
            url = f"{self.settings.mp_public_base_url.rstrip('/')}{CAMINHO_WEBHOOK}"
        # O Mercado Pago recusa endereços locais; sem URL pública a confirmação vem da sincronização.
        if not url or urlsplit(url).scheme != "https":
            return None
        partes = urlsplit(url)
        consulta = dict(parse_qsl(partes.query, keep_blank_values=True))
        consulta.setdefault("source_news", "webhooks")
        return urlunsplit((partes.scheme, partes.netloc, partes.path, urlencode(consulta), partes.fragment))

    def _expirar_reservas(self, anuncio_id: UUID, agora: datetime) -> None:
        vencidos = self.db.scalars(
            select(Pedido).where(
                Pedido.anuncio_id == anuncio_id,
                Pedido.status == StatusPedido.AGUARDANDO_PAGAMENTO,
                Pedido.expira_em <= agora,
            )
        ).all()
        for pedido in vencidos:
            self._cancelar(pedido, agora, status_pedido=StatusPedido.EXPIRADO)
        if vencidos:
            self.db.flush()

    def _expirar_se_vencido(self, pedido: Pedido) -> None:
        agora = _agora()
        if pedido.status == StatusPedido.AGUARDANDO_PAGAMENTO and _com_fuso(pedido.expira_em) <= agora:
            self._cancelar(pedido, agora, status_pedido=StatusPedido.EXPIRADO)
            self.db.commit()

    def _cancelar(self, pedido: Pedido, agora: datetime, *, status_pedido: str = StatusPedido.CANCELADO) -> None:
        pedido.status = status_pedido
        pedido.cancelado_em = agora
        for pagamento in self.db.scalars(select(Pagamento).where(Pagamento.pedido_id == pedido.id)):
            if pagamento.status not in STATUS_FINAIS_PAGAMENTO:
                pagamento.status = StatusPagamento.CANCELADO

    def _pedido_do_comprador(self, pedido_id: UUID, comprador_id: UUID) -> Pedido:
        pedido = self.db.scalar(
            select(Pedido)
            .where(Pedido.id == pedido_id, Pedido.comprador_id == comprador_id)
            .execution_options(populate_existing=True)
        )
        if pedido is None:
            raise _erro(status.HTTP_404_NOT_FOUND, "Pedido não encontrado.")
        return pedido

    def _ultimo_pagamento(self, pedido_id: UUID) -> Pagamento | None:
        return self.db.scalar(
            select(Pagamento).where(Pagamento.pedido_id == pedido_id).order_by(Pagamento.criado_em.desc()).limit(1)
        )

    def _pagamento_do_evento(self, pedido_id: UUID, externo_id: str, dados: dict[str, Any]) -> Pagamento | None:
        pagamento = self.db.scalar(
            select(Pagamento).where(Pagamento.pagamento_externo_id == externo_id, Pagamento.pedido_id == pedido_id)
        )
        if pagamento is not None:
            return pagamento
        # A cobrança ainda sem id externo (ex.: falha logo após criar no Mercado Pago).
        metadata = dados.get("metadata")
        texto = metadata.get("pagamento_id") if isinstance(metadata, dict) else None
        try:
            pagamento_id = UUID(str(texto)) if texto else None
        except ValueError:
            pagamento_id = None
        if pagamento_id is None:
            return None
        pagamento = self.db.scalar(
            select(Pagamento).where(Pagamento.id == pagamento_id, Pagamento.pedido_id == pedido_id)
        )
        if pagamento is not None and pagamento.pagamento_externo_id in (None, externo_id):
            return pagamento
        return None

    @staticmethod
    def _mapear_metodo(dados: dict[str, Any]) -> str:
        tipo = str(dados.get("payment_type_id") or "")
        metodo = str(dados.get("payment_method_id") or "")
        if metodo == "pix" or tipo == "bank_transfer":
            return MetodoPagamento.PIX
        if tipo == "credit_card":
            return MetodoPagamento.CARTAO_CREDITO
        if tipo == "debit_card":
            return MetodoPagamento.CARTAO_DEBITO
        if tipo in {"ticket", "atm"}:
            return MetodoPagamento.BOLETO
        if tipo == "account_money":
            return MetodoPagamento.SALDO_MERCADO_PAGO
        return MetodoPagamento.OUTRO

    @staticmethod
    def _registrar_falha(exc: Exception) -> None:
        if isinstance(exc, MercadoPagoErro):
            payload = exc.payload if isinstance(exc.payload, dict) else {}
            logger.warning(
                "Falha ao gerar Pix no Mercado Pago: status=%s erro=%s mensagem=%s causa=%s",
                exc.status_code,
                payload.get("error") or payload.get("code"),
                payload.get("message"),
                payload.get("cause"),
            )
        else:
            logger.warning("Resposta inválida ao gerar Pix no Mercado Pago: %s", exc)

    def _resposta(self, pedido: Pedido) -> PedidoResposta:
        pagamento = self._ultimo_pagamento(pedido.id)
        pix = None
        if pedido.status == StatusPedido.AGUARDANDO_PAGAMENTO and pagamento and pagamento.qr_code:
            pix = CobrancaPix(
                qr_code=pagamento.qr_code,
                qr_code_base64=pagamento.qr_code_base64,
                ticket_url=pagamento.ticket_url,
                expira_em=_com_fuso(pedido.expira_em),
            )
        return PedidoResposta(
            id=pedido.id,
            anuncio_id=pedido.anuncio_id,
            comprador_id=pedido.comprador_id,
            titulo=pedido.titulo,
            quantidade=pedido.quantidade,
            unidade=pedido.unidade,
            valor_total=pedido.valor_total,
            status=pedido.status,
            criado_em=_com_fuso(pedido.criado_em),
            expira_em=_com_fuso(pedido.expira_em),
            pago_em=_com_fuso(pedido.pago_em) if pedido.pago_em else None,
            cancelado_em=_com_fuso(pedido.cancelado_em) if pedido.cancelado_em else None,
            pix=pix,
            pagamento=PagamentoResumo.model_validate(pagamento) if pagamento else None,
        )
