export const UNIDADES = [
  { valor: "UNIDADE", rotulo: "Unidades", simbolo: "un." },
  { valor: "M2", rotulo: "Metros quadrados", simbolo: "m²" },
  { valor: "M3", rotulo: "Metros cúbicos", simbolo: "m³" },
  { valor: "METRO", rotulo: "Metros", simbolo: "m" },
  { valor: "KG", rotulo: "Quilos", simbolo: "kg" },
  { valor: "LITRO", rotulo: "Litros", simbolo: "L" },
  { valor: "CAIXA", rotulo: "Caixas", simbolo: "caixas" },
  { valor: "SACO", rotulo: "Sacos", simbolo: "sacos" },
  { valor: "LOTE", rotulo: "Lotes", simbolo: "lotes" },
] as const;

export const ESTADOS_CONSERVACAO = [
  { valor: "NOVO", rotulo: "Novo / sem uso" },
  { valor: "USADO", rotulo: "Usado" },
] as const;

export const MODALIDADES_ENTREGA = [
  { valor: "RETIRADA", rotulo: "Retirada no local" },
  { valor: "ENTREGA", rotulo: "Entrega pelo vendedor" },
  { valor: "RETIRADA_ENTREGA", rotulo: "Retirada ou entrega" },
  { valor: "A_COMBINAR", rotulo: "A combinar" },
] as const;

export type UnidadeMaterial = typeof UNIDADES[number]["valor"];
export type EstadoConservacao = typeof ESTADOS_CONSERVACAO[number]["valor"] | "NAO_INFORMADO";
export type ModalidadeEntrega = typeof MODALIDADES_ENTREGA[number]["valor"];

export function formatarQuantidade(quantidade: string | number, unidade: string = "UNIDADE") {
  const numero = Number(String(quantidade).replace(",", "."));
  const simbolo = UNIDADES.find((item) => item.valor === unidade)?.simbolo ?? "un.";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(numero)} ${simbolo}`;
}

export function descreverConservacao(valor: string) {
  return ESTADOS_CONSERVACAO.find((item) => item.valor === valor)?.rotulo ?? "Não informado";
}

export function descreverEntrega(valor: string) {
  return MODALIDADES_ENTREGA.find((item) => item.valor === valor)?.rotulo ?? "A combinar";
}
