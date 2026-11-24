import { requisicaoApi } from "./api";
import type { StatusPedido } from "@/features/pagamentos/pagamento";

export type PagamentoResumo = {
  id: string;
  status: string;
  metodo: string | null;
  status_detalhe: string | null;
  pagamento_externo_id: string | null;
  aprovado_em: string | null;
};

export type CobrancaPix = {
  qr_code: string;
  qr_code_base64: string | null;
  ticket_url: string | null;
  expira_em: string;
};

export type Pedido = {
  id: string;
  anuncio_id: string;
  comprador_id: string;
  titulo: string;
  quantidade: string;
  unidade: string;
  valor_total: string;
  status: StatusPedido;
  criado_em: string;
  expira_em: string;
  pago_em: string | null;
  cancelado_em: string | null;
  // Presente enquanto o pedido aguarda o Pix.
  pix: CobrancaPix | null;
  pagamento: PagamentoResumo | null;
};

// Cria o pedido e gera o QR code Pix (ou devolve o Pix ainda válido do mesmo comprador).
export function iniciarCheckoutPix(dados: { anuncio_id: string; comprador_id: string }): Promise<Pedido> {
  return requisicaoApi<Pedido>("/api/v1/pedidos/checkout-pix", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

function caminhoPedido(pedidoId: string, compradorId: string, sufixo = "") {
  return `/api/v1/pedidos/${encodeURIComponent(pedidoId)}${sufixo}?comprador_id=${encodeURIComponent(compradorId)}`;
}

export function obterPedido(pedidoId: string, compradorId: string): Promise<Pedido> {
  return requisicaoApi<Pedido>(caminhoPedido(pedidoId, compradorId));
}

// Consulta o Mercado Pago pelo backend; útil quando o webhook ainda não chegou.
export function sincronizarPedido(pedidoId: string, compradorId: string): Promise<Pedido> {
  return requisicaoApi<Pedido>(caminhoPedido(pedidoId, compradorId, "/sincronizar"), { method: "POST" });
}

// "Meus pedidos": compras do usuário, da mais recente para a mais antiga.
export function listarPedidos(compradorId: string): Promise<Pedido[]> {
  return requisicaoApi<Pedido[]>(`/api/v1/pedidos?comprador_id=${encodeURIComponent(compradorId)}`);
}
