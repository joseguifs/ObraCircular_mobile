import type { TomStatus } from "@/features/usuarios/perfil";

export type StatusRepasse = "PENDENTE" | "PAGO";

type RepasseResumido = {
  status: StatusRepasse;
  pedido_status: string;
  chave_pix: string | null;
  alerta_reembolso: boolean;
};

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Valor em reais; diferente de formatarPreco, zero continua sendo um valor (ex.: taxa zerada). */
export function formatarValor(valor: string | number) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? formatadorMoeda.format(numero) : "-";
}

/** Percentual da taxa aplicada, calculado a partir dos valores gravados. */
export function formatarPercentualTaxa(valorBruto: string | number, taxa: string | number) {
  const bruto = Number(valorBruto);
  const valorTaxa = Number(taxa);
  if (!Number.isFinite(bruto) || !Number.isFinite(valorTaxa) || bruto <= 0) return null;

  const percentual = Math.round((valorTaxa / bruto) * 1000) / 10;
  return `${percentual.toLocaleString("pt-BR")}%`;
}

export function obterEtiquetaRepasse(repasse: RepasseResumido): { rotulo: string; tom: TomStatus } {
  // O valor já saiu da conta e o comprador recebeu o dinheiro de volta.
  if (repasse.alerta_reembolso) return { rotulo: "Reembolsado após repasse", tom: "erro" };
  if (repasse.status === "PAGO") return { rotulo: "Repassado", tom: "sucesso" };
  if (!repasse.chave_pix) return { rotulo: "Sem chave Pix", tom: "alerta" };
  return { rotulo: "A repassar", tom: "neutro" };
}

/** Mesmas regras do backend: pedido pago, ainda não repassado e com chave Pix cadastrada. */
export function podeMarcarComoRepassado(repasse: RepasseResumido) {
  return repasse.status === "PENDENTE" && repasse.pedido_status === "PAGO" && Boolean(repasse.chave_pix);
}

/** Soma em centavos para evitar erros de arredondamento com valores decimais. */
export function somarValorPendente(repasses: (RepasseResumido & { valor_liquido: string })[]) {
  const centavos = repasses
    .filter((repasse) => repasse.status === "PENDENTE")
    .reduce((total, repasse) => total + Math.round(Number(repasse.valor_liquido) * 100), 0);
  return centavos / 100;
}
