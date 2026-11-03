import assert from "node:assert/strict";
import test from "node:test";

import { formatarCep, normalizarEndereco, validarEndereco } from "./validacaoEndereco.ts";

test("valida e normaliza endereço de retirada", () => {
  const dados = {
    cep: "77000-000",
    logradouro: " Avenida Central ",
    numero: " 10 ",
    complemento: " ",
    bairro: " Centro ",
    cidade: " Palmas ",
    estado: "to",
  };
  assert.deepEqual(validarEndereco(dados), {});
  assert.deepEqual(normalizarEndereco(dados), {
    cep: "77000000",
    logradouro: "Avenida Central",
    numero: "10",
    complemento: null,
    bairro: "Centro",
    cidade: "Palmas",
    estado: "TO",
  });
});

test("rejeita endereço incompleto e formata CEP", () => {
  const erros = validarEndereco({
    cep: "123",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "T",
  });
  assert.equal(Object.keys(erros).length, 6);
  assert.equal(formatarCep("77000000"), "77000-000");
});

test("rejeita uma sigla de UF inexistente", () => {
  const erros = validarEndereco({
    cep: "77000-000",
    logradouro: "Avenida Central",
    numero: "10",
    complemento: "",
    bairro: "Centro",
    cidade: "Palmas",
    estado: "ZZ",
  });
  assert.equal(erros.estado, "Informe uma UF válida.");
});
