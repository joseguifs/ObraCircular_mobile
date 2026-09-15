const PADRAO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export type TomStatus = "sucesso" | "alerta" | "erro" | "neutro";

export type DescricaoStatus = {
  rotulo: string;
  tom: TomStatus;
};

const statusUsuario: Record<string, DescricaoStatus> = {
  ATIVO: { rotulo: "Conta ativa", tom: "sucesso" },
  INATIVO: { rotulo: "Conta inativa", tom: "neutro" },
  BLOQUEADO: { rotulo: "Conta bloqueada", tom: "erro" },
};

const statusAnuncio: Record<string, DescricaoStatus> = {
  ATIVO: { rotulo: "Ativo", tom: "sucesso" },
  ESGOTADO: { rotulo: "Esgotado", tom: "alerta" },
  ENCERRADO: { rotulo: "Encerrado", tom: "neutro" },
};

export function ehIdentificadorValido(valor: string) {
  return PADRAO_UUID.test(valor);
}

export function obterIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";

  const primeira = Array.from(partes[0])[0];
  const ultima = partes.length > 1 ? Array.from(partes[partes.length - 1])[0] : "";
  return `${primeira}${ultima}`.toLocaleUpperCase("pt-BR");
}

export function formatarTelefone(telefone: string | null) {
  if (!telefone) return null;

  // A API salva o telefone como +55 seguido de DDD e número.
  const numeros = telefone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  }
  if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return telefone;
}

function lerData(dataIso: string) {
  const data = new Date(dataIso);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function formatarMembroDesde(dataIso: string) {
  const data = lerData(dataIso);
  return data ? `${MESES[data.getMonth()]} de ${data.getFullYear()}` : null;
}

export function formatarData(dataIso: string) {
  const data = lerData(dataIso);
  if (!data) return null;

  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${data.getFullYear()}`;
}

export function formatarPreco(preco: string | number) {
  const valor = Number(preco);
  if (!Number.isFinite(valor)) return "Preço não informado";
  if (valor === 0) return "Doação";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function resumirAnuncios(anuncios: { status: string }[]) {
  const ativos = anuncios.filter((anuncio) => anuncio.status === "ATIVO").length;
  return { total: anuncios.length, ativos, finalizados: anuncios.length - ativos };
}

export function resumirLocalizacao(enderecos: { cidade: string; estado: string }[]) {
  const cidades = [...new Set(enderecos.map((endereco) => `${endereco.cidade}/${endereco.estado}`))];
  return cidades.length > 0 ? cidades.join(" · ") : null;
}

export function descreverStatusUsuario(status: string): DescricaoStatus {
  return statusUsuario[status] ?? { rotulo: status, tom: "neutro" };
}

export function descreverStatusAnuncio(status: string): DescricaoStatus {
  return statusAnuncio[status] ?? { rotulo: status, tom: "neutro" };
}
