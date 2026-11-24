import assert from "node:assert/strict";
import test from "node:test";

import { cpfValido, formatarCpf, normalizarChavePix, validarChavePix } from "./chavePix.ts";

test("valida CPF pelos dígitos verificadores", () => {
  assert.equal(cpfValido("52998224725"), true);
  assert.equal(cpfValido("52998224724"), false);
  assert.equal(cpfValido("11111111111"), false);
  assert.equal(cpfValido("5299822472"), false);
});

test("aplica a máscara de CPF enquanto digita", () => {
  assert.equal(formatarCpf("529"), "529");
  assert.equal(formatarCpf("5299"), "529.9");
  assert.equal(formatarCpf("5299822"), "529.982.2");
  assert.equal(formatarCpf("52998224725"), "529.982.247-25");
  assert.equal(formatarCpf("529.982.247-2599"), "529.982.247-25");
});

test("normaliza a chave no formato aceito pela API", () => {
  assert.equal(normalizarChavePix("CPF", "529.982.247-25"), "52998224725");
  assert.equal(normalizarChavePix("EMAIL", "  Maria@Example.COM "), "maria@example.com");
});

test("exige tipo e chave válidos", () => {
  assert.equal(validarChavePix("CPF", "529.982.247-25"), undefined);
  assert.equal(validarChavePix("EMAIL", "maria@example.com"), undefined);
  assert.match(validarChavePix("", "maria@example.com"), /tipo/);
  assert.match(validarChavePix("EMAIL", "  "), /Informe a chave/);
  assert.match(validarChavePix("EMAIL", "maria@"), /e-mail válido/);
  assert.match(validarChavePix("CPF", "123.456.789-00"), /CPF válido/);
});
