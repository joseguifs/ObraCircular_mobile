import assert from "node:assert/strict";
import test from "node:test";

import { correspondeBusca, normalizarTextoBusca } from "./busca.ts";

test("normaliza o texto ignorando acentos, caixa e espaços nas pontas", () => {
  assert.equal(normalizarTextoBusca("  Louças e Hidráulica "), "loucas e hidraulica");
  assert.equal(normalizarTextoBusca("CERÂMICA"), "ceramica");
});

test("encontra anúncios mesmo sem digitar os acentos", () => {
  assert.equal(correspondeBusca(["Sobras de piso cerâmico", "Pisos e revestimentos"], "ceramico"), true);
  assert.equal(correspondeBusca(["Pia de inox", "Louças e hidráulica"], "HIDRAULICA"), true);
  assert.equal(correspondeBusca(["Telhas coloniais", null], "madeira"), false);
});

test("considera qualquer anúncio quando a busca está vazia", () => {
  assert.equal(correspondeBusca(["Tijolos"], "   "), true);
});
