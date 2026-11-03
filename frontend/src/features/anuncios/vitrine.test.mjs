import assert from "node:assert/strict";
import test from "node:test";

import { FILTROS_INICIAIS, filtrarVitrine } from "./vitrine.ts";

const categorias = [
  { id: "pisos", nome: "Pisos e revestimentos" },
  { id: "hidraulica", nome: "Hidráulica" },
];
const anuncios = [
  { id: "piso", titulo: "Piso cerâmico", descricao: "Caixas de cerâmica azul", categoria_id: "pisos", preco: "100.00", status: "ATIVO", postado_em: "2026-10-20T10:00:00Z" },
  { id: "doacao", titulo: "Azulejos para reaproveitar", descricao: "Retirada gratuita no local", categoria_id: "pisos", preco: "0.00", status: "ATIVO", postado_em: "2026-10-21T10:00:00Z" },
  { id: "torneira", titulo: "Torneira de metal", descricao: "Peça sem uso", categoria_id: "hidraulica", preco: "50.50", status: "ATIVO", postado_em: "2026-10-22T10:00:00Z" },
  { id: "esgotado", titulo: "Piso cerâmico", descricao: "Caixas de cerâmica azul", categoria_id: "pisos", preco: "0.00", status: "ESGOTADO", postado_em: "2026-10-23T10:00:00Z" },
  { id: "encerrado", titulo: "Piso cerâmico", descricao: "Caixas de cerâmica azul", categoria_id: "pisos", preco: "20.00", status: "ENCERRADO", postado_em: "2026-10-24T10:00:00Z" },
];

function selecionar(alteracoes = {}, lista = anuncios) {
  return filtrarVitrine(lista, categorias, { ...FILTROS_INICIAIS, ...alteracoes });
}
function ids(resultado) {
  return resultado.anuncios.map((anuncio) => anuncio.id);
}

test("exibe somente anúncios ativos, do mais recente ao mais antigo", () => {
  const resultado = selecionar();
  assert.deepEqual(ids(resultado), ["torneira", "doacao", "piso"]);
  assert.equal(resultado.erroPreco, null);
});

test("busca por título, descrição e categoria sem distinguir acentos ou caixa", () => {
  assert.deepEqual(ids(selecionar({ busca: "  CERAMICO  " })), ["piso"]);
  assert.deepEqual(ids(selecionar({ busca: "ceramica azul" })), ["piso"]);
  assert.deepEqual(ids(selecionar({ busca: "hidraulica" })), ["torneira"]);
  assert.deepEqual(ids(selecionar({ busca: "revestimentos" })), ["doacao", "piso"]);
});

test("combina busca, categoria e faixa de preço com limites inclusivos", () => {
  assert.deepEqual(ids(selecionar({ busca: "ceramica", categoriaId: "pisos", precoMinimo: "100", precoMaximo: "100,00" })), ["piso"]);
  assert.deepEqual(ids(selecionar({ categoriaId: "hidraulica", precoMinimo: "50,50", precoMaximo: "50,50" })), ["torneira"]);
  assert.deepEqual(ids(selecionar({ categoriaId: "pisos", precoMinimo: "0", precoMaximo: "0" })), ["doacao"]);
  assert.deepEqual(ids(selecionar({ busca: "torneira", categoriaId: "pisos" })), []);
});

test("permite limites independentes e campos em branco", () => {
  assert.deepEqual(ids(selecionar({ precoMinimo: "50,5" })), ["torneira", "piso"]);
  assert.deepEqual(ids(selecionar({ precoMaximo: "50,49" })), ["doacao"]);
  assert.deepEqual(ids(selecionar({ precoMinimo: "  ", precoMaximo: " " })), ["torneira", "doacao", "piso"]);
});

test("interpreta separadores de milhares e centavos brasileiros", () => {
  const lista = [{ ...anuncios[0], preco: "1234.56" }];
  assert.deepEqual(ids(selecionar({ precoMinimo: " 1.234,56 ", precoMaximo: "1234,56" }, lista)), ["piso"]);
  assert.deepEqual(ids(selecionar({ precoMaximo: "1.234,55" }, lista)), []);
  assert.deepEqual(ids(selecionar({ precoMinimo: "1.234,57" }, lista)), []);
});

test("rejeita preços negativos, malformados e fora da precisão segura", () => {
  for (const valor of ["-1", "abc", "10,999", "1,2,3", "12.50", "Infinity", "1e3", "9007199254740991"]) {
    for (const campo of ["precoMinimo", "precoMaximo"]) {
      const resultado = selecionar({ [campo]: valor });
      assert.deepEqual(resultado.anuncios, [], `${campo}: ${valor}`);
      assert.match(resultado.erroPreco, /preços válidos/);
    }
  }
});

test("informa quando o mínimo supera o máximo e recupera ao corrigir", () => {
  const resultado = selecionar({ precoMinimo: "100", precoMaximo: "50" });
  assert.deepEqual(resultado.anuncios, []);
  assert.match(resultado.erroPreco, /mínimo.*máximo/);
  assert.equal(selecionar({ precoMinimo: "50", precoMaximo: "100" }).erroPreco, null);
});

test("somente doações suspende a faixa de preço e mantém busca e categoria", () => {
  assert.deepEqual(ids(selecionar({ somenteDoacoes: true, precoMinimo: "100", precoMaximo: "inválido" })), ["doacao"]);
  assert.equal(selecionar({ somenteDoacoes: true, precoMaximo: "inválido" }).erroPreco, null);
  assert.deepEqual(ids(selecionar({ somenteDoacoes: true, categoriaId: "hidraulica" })), []);
  assert.deepEqual(ids(selecionar({ somenteDoacoes: true, busca: "gratuita" })), ["doacao"]);
  assert.deepEqual(ids(selecionar({ somenteDoacoes: true, busca: "ceramica" })), []);
  assert.deepEqual(ids(selecionar({ somenteDoacoes: false, precoMinimo: "100" })), ["piso"]);
});

test("ordena preços numericamente, incluindo doações", () => {
  assert.deepEqual(ids(selecionar({ ordenacao: "menor-preco" })), ["doacao", "torneira", "piso"]);
  assert.deepEqual(ids(selecionar({ ordenacao: "maior-preco" })), ["piso", "torneira", "doacao"]);
});

test("desempata preços pela data e respeita fusos horários", () => {
  const lista = [
    { ...anuncios[0], id: "antigo", preco: "10.00", postado_em: "2026-10-20T10:00:00Z" },
    { ...anuncios[0], id: "recente", preco: "10.00", postado_em: "2026-10-20T08:00:00-03:00" },
  ];
  for (const ordenacao of ["recentes", "menor-preco", "maior-preco"]) {
    assert.deepEqual(ids(selecionar({ ordenacao }, lista)), ["recente", "antigo"]);
  }
});

test("não altera a lista original nem os filtros ao ordenar", () => {
  const lista = Object.freeze(anuncios.map((anuncio) => Object.freeze({ ...anuncio })));
  const filtros = Object.freeze({ ...FILTROS_INICIAIS, ordenacao: "maior-preco" });
  assert.deepEqual(ids(filtrarVitrine(lista, categorias, filtros)), ["piso", "torneira", "doacao"]);
  assert.deepEqual(lista.map((anuncio) => anuncio.id), ["piso", "doacao", "torneira", "esgotado", "encerrado"]);
});

test("funciona sem anúncios ou sem categorias carregadas", () => {
  assert.deepEqual(selecionar({}, []), { anuncios: [], erroPreco: null });
  assert.deepEqual(ids(filtrarVitrine(anuncios, [], { ...FILTROS_INICIAIS, busca: "ceramico" })), ["piso"]);
});
