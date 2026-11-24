export type StatusPedido = "AGUARDANDO_PAGAMENTO" | "PAGO" | "CANCELADO" | "EXPIRADO" | "REEMBOLSADO";

export type TomStatus = "pendente" | "sucesso" | "erro" | "neutro";

type AnuncioCompra = { vendedor_id: string; status: string; preco: string | number };

const IDENTIFICADOR = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function obterDisponibilidadeCompra(
  anuncio: AnuncioCompra,
  usuarioId: string | undefined,
): { disponivel: true; motivo: null } | { disponivel: false; motivo: string } {
  if (!usuarioId || !IDENTIFICADOR.test(usuarioId)) {
    return { disponivel: false, motivo: "Entre na sua conta para comprar com Pix." };
  }
  if (usuarioId.toLowerCase() === anuncio.vendedor_id.toLowerCase()) {
    return { disponivel: false, motivo: "Este anúncio é seu." };
  }
  if (anuncio.status !== "ATIVO") {
    return { disponivel: false, motivo: "Este anúncio não está disponível para compra." };
  }
  const preco = Number(anuncio.preco);
  if (!Number.isFinite(preco) || preco <= 0) {
    return { disponivel: false, motivo: "Doação: combine a retirada diretamente com o vendedor." };
  }
  return { disponivel: true, motivo: null };
}

export function descreverStatusPedido(status: string): { rotulo: string; descricao: string; tom: TomStatus } {
  switch (status) {
    case "AGUARDANDO_PAGAMENTO":
      return {
        rotulo: "Aguardando Pix",
        descricao: "O anúncio está reservado para você. Pague o Pix pelo app do seu banco; a confirmação chega em instantes.",
        tom: "pendente",
      };
    case "PAGO":
      return {
        rotulo: "Pagamento confirmado",
        descricao: "Recebemos o seu Pix. Combine a retirada ou entrega com o vendedor.",
        tom: "sucesso",
      };
    case "EXPIRADO":
      return {
        rotulo: "Reserva expirada",
        descricao: "O prazo para pagar terminou e o anúncio voltou a ficar disponível.",
        tom: "erro",
      };
    case "CANCELADO":
      return {
        rotulo: "Pagamento cancelado",
        descricao: "O Pix não foi concluído. Você pode tentar comprar novamente se o anúncio ainda estiver disponível.",
        tom: "erro",
      };
    case "REEMBOLSADO":
      return {
        rotulo: "Pagamento devolvido",
        descricao: "O valor foi devolvido pelo Mercado Pago para a conta de origem.",
        tom: "neutro",
      };
    default:
      return { rotulo: "Status desconhecido", descricao: "Atualize para consultar o pedido novamente.", tom: "neutro" };
  }
}

export function pedidoEmAndamento(status: string): boolean {
  return status === "AGUARDANDO_PAGAMENTO";
}

// Parâmetros de rota podem chegar repetidos; usamos apenas o primeiro valor textual.
export function lerParametro(valor: string | string[] | undefined): string | undefined {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return typeof texto === "string" && texto.trim() ? texto.trim() : undefined;
}

// Tempo restante para pagar no formato mm:ss (ou h:mm:ss); null quando o Pix venceu.
export function formatarTempoRestante(expiraEm: string, agora: number = Date.now()): string | null {
  const fim = new Date(expiraEm).getTime();
  if (!Number.isFinite(fim)) return null;
  const segundos = Math.floor((fim - agora) / 1000);
  if (segundos <= 0) return null;
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const resto = String(segundos % 60).padStart(2, "0");
  return horas > 0 ? `${horas}:${String(minutos).padStart(2, "0")}:${resto}` : `${String(minutos).padStart(2, "0")}:${resto}`;
}

// A imagem chega como PNG em base64; o código copia e cola é a alternativa quando ela falta.
export function uriImagemQrCode(qrCodeBase64: string | null | undefined): string | null {
  const conteudo = qrCodeBase64?.trim();
  if (!conteudo) return null;
  return conteudo.startsWith("data:") ? conteudo : `data:image/png;base64,${conteudo}`;
}
