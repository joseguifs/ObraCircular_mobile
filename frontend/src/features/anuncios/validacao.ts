export type DadosFormularioAnuncio = {
  titulo: string;
  descricao: string;
  categoriaId: string;
  preco: string;
  quantidade: string;
  imagemUrl: string;
};

export type ErrosFormularioAnuncio = Partial<Record<keyof DadosFormularioAnuncio, string>>;

export function moedaParaCentavos(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  return digitos ? Number(digitos) : 0;
}

export function formatarMoeda(valor: string) {
  const centavos = moedaParaCentavos(valor);
  if (!valor && centavos === 0) return "";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

export function validarAnuncio(dados: DadosFormularioAnuncio): ErrosFormularioAnuncio {
  const erros: ErrosFormularioAnuncio = {};
  const titulo = dados.titulo.trim().replace(/\s+/g, " ");
  const descricao = dados.descricao.trim().replace(/\s+/g, " ");
  const quantidade = Number(dados.quantidade);

  if (titulo.length < 5) erros.titulo = "Use um título com pelo menos 5 caracteres.";
  else if (titulo.length > 150) erros.titulo = "O título deve ter no máximo 150 caracteres.";

  if (descricao.length < 20) erros.descricao = "Descreva o material em pelo menos 20 caracteres.";
  if (!dados.categoriaId) erros.categoriaId = "Selecione uma categoria.";
  if (!dados.preco.trim()) erros.preco = "Informe o preço, mesmo que seja R$ 0,00.";
  if (!/^\d+$/.test(dados.quantidade) || !Number.isInteger(quantidade) || quantidade < 1) {
    erros.quantidade = "Informe uma quantidade inteira a partir de 1.";
  }
  if (dados.imagemUrl.trim() && !/^https?:\/\/\S+$/i.test(dados.imagemUrl.trim())) {
    erros.imagemUrl = "Informe um endereço de imagem iniciado por http:// ou https://.";
  }

  return erros;
}

export function normalizarAnuncio(dados: DadosFormularioAnuncio) {
  return {
    titulo: dados.titulo.trim().replace(/\s+/g, " "),
    descricao: dados.descricao.trim().replace(/\s+/g, " "),
    categoria_id: dados.categoriaId,
    preco: moedaParaCentavos(dados.preco) / 100,
    quantidade: Number(dados.quantidade),
    imagem_url: dados.imagemUrl.trim() || null,
  };
}
