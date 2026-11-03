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
  categoriaId: "10000000-0000-4000-8000-000000000003",
  preco: "R$ 120,00",
  quantidade: "4",
  imagemUrl: "https://example.com/piso.jpg",
};

test("aceita e normaliza um anúncio válido", () => {
  assert.deepEqual(validarAnuncio(anuncioValido), {});
  assert.deepEqual(normalizarAnuncio(anuncioValido), {
    titulo: "Sobras de piso cerâmico",
    descricao: "Quatro caixas fechadas que restaram da reforma.",
    categoria_id: "10000000-0000-4000-8000-000000000003",
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
    quantidade: "-1",
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

test("aceita estoque inicial zerado conforme o contrato da API", () => {
  assert.deepEqual(validarAnuncio({ ...anuncioValido, quantidade: "0" }), {});
});

test("formata o preço digitado em centavos", () => {
  assert.equal(moedaParaCentavos("R$ 1.234,56"), 123456);
  assert.match(formatarMoeda("123456"), /1\.234,56/);
});

test("aceita doações e o maior preço permitido pela API", () => {
  for (const preco of ["R$ 0,00", "R$ 9.999.999.999,99"]) {
    assert.deepEqual(validarAnuncio({ ...anuncioValido, preco }), {});
  }
  assert.equal(
    normalizarAnuncio({ ...anuncioValido, preco: "R$ 9.999.999.999,99" }).preco,
    9999999999.99,
  );
});

test("rejeita preços acima do limite da API, inclusive valores muito grandes", () => {
  for (const preco of ["R$ 10.000.000.000,00", "9".repeat(400)]) {
    assert.equal(
      validarAnuncio({ ...anuncioValido, preco }).preco,
      "O preço deve ser de no máximo R$ 9.999.999.999,99.",
    );
  }
});

test("continua exigindo preço preenchido, mesmo quando aceita doações", () => {
  for (const preco of ["", "   "]) {
    assert.equal(
      validarAnuncio({ ...anuncioValido, preco }).preco,
      "Informe o preço, mesmo que seja R$ 0,00.",
    );
  }
});
