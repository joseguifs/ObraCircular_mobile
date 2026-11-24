import { ESTADOS_CONSERVACAO, MODALIDADES_ENTREGA, UNIDADES } from "./materiais.ts";
import type { EstadoConservacao, ModalidadeEntrega, UnidadeMaterial } from "./materiais.ts";

export type DadosFormularioAnuncio = {
  titulo: string;
  descricao: string;
  categoriaId: string;
  preco: string;
  quantidade: string;
  imagemUrl: string;
  unidade: string;
  estadoConservacao: string;
  dimensoes: string;
  modalidadeEntrega: string;
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
  const quantidade = Number(dados.quantidade.replace(",", "."));

  if (titulo.length < 5) erros.titulo = "Use um título com pelo menos 5 caracteres.";
  else if (titulo.length > 150) erros.titulo = "O título deve ter no máximo 150 caracteres.";

  if (descricao.length < 20) erros.descricao = "Descreva o material em pelo menos 20 caracteres.";
  else if (descricao.length > 5000) erros.descricao = "A descrição deve ter no máximo 5.000 caracteres.";
  if (!dados.categoriaId) erros.categoriaId = "Selecione uma categoria.";
  if (!dados.preco.trim()) erros.preco = "Informe o preço, mesmo que seja R$ 0,00.";
  // A API aceita 12 dígitos no total, sendo 2 casas decimais.
  else if (moedaParaCentavos(dados.preco) > 999_999_999_999) {
    erros.preco = "O preço deve ser de no máximo R$ 9.999.999.999,99.";
  }
  if (!/^\d{1,12}([.,]\d{1,3})?$/.test(dados.quantidade) || !Number.isFinite(quantidade) || quantidade < 0 || quantidade > 999_999_999_999.999) {
    erros.quantidade = "Informe uma quantidade a partir de 0, com até 3 casas decimais.";
  }
  if (!UNIDADES.some((item) => item.valor === dados.unidade)) erros.unidade = "Selecione a unidade de medida.";
  if (!ESTADOS_CONSERVACAO.some((item) => item.valor === dados.estadoConservacao)) erros.estadoConservacao = "Informe o estado de conservação.";
  if (!MODALIDADES_ENTREGA.some((item) => item.valor === dados.modalidadeEntrega)) erros.modalidadeEntrega = "Selecione retirada ou entrega.";
  if (dados.dimensoes.trim().length > 200) erros.dimensoes = "Use até 200 caracteres para as dimensões.";
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
    quantidade: Number(dados.quantidade.replace(",", ".")),
    unidade: dados.unidade as UnidadeMaterial,
    estado_conservacao: dados.estadoConservacao as EstadoConservacao,
    dimensoes: dados.dimensoes.trim().replace(/\s+/g, " ") || null,
    modalidade_entrega: dados.modalidadeEntrega as ModalidadeEntrega,
    imagem_url: dados.imagemUrl.trim() || null,
  };
}
