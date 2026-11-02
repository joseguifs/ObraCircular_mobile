export type OrdenacaoVitrine = "recentes" | "menor-preco" | "maior-preco";

export type FiltrosVitrine = {
  busca: string;
  categoriaId: string | null;
  precoMinimo: string;
  precoMaximo: string;
  somenteDoacoes: boolean;
  ordenacao: OrdenacaoVitrine;
};

export const FILTROS_INICIAIS: FiltrosVitrine = {
  busca: "",
  categoriaId: null,
  precoMinimo: "",
  precoMaximo: "",
  somenteDoacoes: false,
  ordenacao: "recentes",
};

type AnuncioVitrine = {
  titulo: string;
  descricao: string;
  categoria_id: string;
  preco: string;
  status: string;
  postado_em: string;
};

function normalizarBusca(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

// Campos vazios não limitam a faixa; valores brasileiros são comparados em centavos.
function lerCentavos(valor: string): number | null {
  const texto = valor.trim();
  if (!texto) return null;
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(texto)) return NaN;
  const [inteiro, decimal = ""] = texto.replace(/\./g, "").split(",");
  const centavos = Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) ? centavos : NaN;
}

export function filtrarVitrine<T extends AnuncioVitrine>(
  anuncios: T[],
  categorias: { id: string; nome: string }[],
  filtros: FiltrosVitrine,
): { anuncios: T[]; erroPreco: string | null } {
  const minimo = filtros.somenteDoacoes ? null : lerCentavos(filtros.precoMinimo);
  const maximo = filtros.somenteDoacoes ? null : lerCentavos(filtros.precoMaximo);
  if (Number.isNaN(minimo) || Number.isNaN(maximo)) {
    return { anuncios: [], erroPreco: "Informe preços válidos, como 50 ou 1.234,56." };
  }
  if (minimo !== null && maximo !== null && minimo > maximo) {
    return { anuncios: [], erroPreco: "O preço mínimo deve ser menor ou igual ao máximo." };
  }

  const categoriaPorId = new Map(categorias.map((categoria) => [categoria.id, categoria.nome]));
  const termo = normalizarBusca(filtros.busca);
  const resultado = anuncios.filter((anuncio) => {
    if (anuncio.status !== "ATIVO") return false;
    if (filtros.categoriaId && anuncio.categoria_id !== filtros.categoriaId) return false;
    const preco = Math.round(Number(anuncio.preco) * 100);
    if (!Number.isSafeInteger(preco) || preco < 0) return false;
    if (filtros.somenteDoacoes && preco !== 0) return false;
    if (minimo !== null && preco < minimo) return false;
    if (maximo !== null && preco > maximo) return false;
    return !termo || normalizarBusca(
      `${anuncio.titulo} ${anuncio.descricao} ${categoriaPorId.get(anuncio.categoria_id) ?? ""}`,
    ).includes(termo);
  });

  const porData = (a: T, b: T) => Date.parse(b.postado_em) - Date.parse(a.postado_em);
  resultado.sort((a, b) => {
    if (filtros.ordenacao === "menor-preco") return Number(a.preco) - Number(b.preco) || porData(a, b);
    if (filtros.ordenacao === "maior-preco") return Number(b.preco) - Number(a.preco) || porData(a, b);
    return porData(a, b);
  });
  return { anuncios: resultado, erroPreco: null };
}
