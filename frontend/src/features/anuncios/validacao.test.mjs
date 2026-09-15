import assert from "node:assert/strict";
import test from "node:test";

import {
  formatarMoeda,
  moedaParaCentavos,
  normalizarAnuncio,
  validarAnuncio,
} from "./validacao.ts";

const anuncioValido = {
  titulo: "Sobras de piso cerâmico",
  descricao: "Quatro caixas fechadas que restaram da reforma.",
  categoriaId: "pisos",
  preco: "R$ 120,00",
  quantidade: "4",
  imagemUrl: "https://example.com/piso.jpg",
};

test("aceita e normaliza um anúncio válido", () => {
  assert.deepEqual(validarAnuncio(anuncioValido), {});
  assert.deepEqual(normalizarAnuncio(anuncioValido), {
    titulo: "Sobras de piso cerâmico",
    descricao: "Quatro caixas fechadas que restaram da reforma.",
    categoria_id: "pisos",
    preco: 120,
    quantidade: 4,
    imagem_url: "https://example.com/piso.jpg",
  });
});

test("rejeita os campos obrigatórios inválidos", () => {
  const erros = validarAnuncio({
    titulo: "Piso",
    descricao: "Pouca informação",
    categoriaId: "",
    preco: "",
    quantidade: "0",
    imagemUrl: "arquivo-local.jpg",
  });

  assert.deepEqual(Object.keys(erros).sort(), [
    "categoriaId",
    "descricao",
    "imagemUrl",
    "preco",
    "quantidade",
    "titulo",
  ]);
});

test("formata o preço digitado em centavos", () => {
  assert.equal(moedaParaCentavos("R$ 1.234,56"), 123456);
  assert.match(formatarMoeda("123456"), /1\.234,56/);
});
