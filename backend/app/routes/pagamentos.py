from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Header, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.pedido import CheckoutPixCreate, PedidoResposta
from app.services.pagamento_pix import PagamentoPixService

DbSession = Annotated[Session, Depends(get_db)]

pedidos_router = APIRouter()
webhooks_router = APIRouter()


@pedidos_router.post("/checkout-pix", response_model=PedidoResposta, status_code=status.HTTP_201_CREATED)
def criar_checkout_pix(dados: CheckoutPixCreate, db: DbSession) -> PedidoResposta:
    """Cria o pedido, reserva o anúncio e devolve o QR code e o código Pix copia e cola."""
    return PagamentoPixService(db).criar_checkout(dados)


@pedidos_router.get("", response_model=list[PedidoResposta])
def listar_pedidos(comprador_id: Annotated[UUID, Query()], db: DbSession) -> list[PedidoResposta]:
    """Pedidos do comprador ("Meus pedidos"), do mais recente para o mais antigo."""
    return PagamentoPixService(db).listar_pedidos(comprador_id)


@pedidos_router.get("/{pedido_id}", response_model=PedidoResposta)
def obter_pedido(pedido_id: UUID, comprador_id: Annotated[UUID, Query()], db: DbSession) -> PedidoResposta:
    return PagamentoPixService(db).obter_pedido(pedido_id, comprador_id)


@pedidos_router.post("/{pedido_id}/sincronizar", response_model=PedidoResposta)
def sincronizar_pedido(pedido_id: UUID, comprador_id: Annotated[UUID, Query()], db: DbSession) -> PedidoResposta:
    """Consulta o Mercado Pago e atualiza o pedido sem depender da chegada do webhook."""
    return PagamentoPixService(db).sincronizar(pedido_id, comprador_id)


@webhooks_router.post("/mercado-pago", status_code=status.HTTP_200_OK)
def webhook_mercado_pago(
    db: DbSession,
    payload: Annotated[dict[str, Any] | None, Body()] = None,
    data_id: Annotated[str | None, Query(alias="data.id")] = None,
    tipo: Annotated[str | None, Query(alias="type")] = None,
    x_signature: Annotated[str | None, Header()] = None,
    x_request_id: Annotated[str | None, Header()] = None,
) -> Response:
    """Recebe as notificações assinadas do Mercado Pago sobre pagamentos."""
    payload = payload or {}
    if data_id is None and isinstance(payload.get("data"), dict):
        data_id = str(payload["data"].get("id") or "") or None
    PagamentoPixService(db).processar_webhook(
        tipo=tipo,
        data_id=data_id,
        x_signature=x_signature,
        x_request_id=x_request_id,
        payload=payload,
    )
    return Response(status_code=status.HTTP_200_OK)
