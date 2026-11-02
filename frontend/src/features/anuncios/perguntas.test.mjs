import assert from "node:assert/strict";
import test from "node:test";

import {
  contarPendentes,
  descreverTotalPerguntas,
  formatarTempoRelativo,
  mesclarPerguntas,
  PERGUNTA_MAX,
  RESPOSTA_MAX,
  validarPergunta,
  validarResposta,
} from "./perguntas.ts";

test("valida o tamanho da pergunta ignorando espaços nas pontas", () => {
  assert.match(validarPergunta("  oi  "), /pelo menos 3/);
  assert.equal(validarPergunta("  Ainda tem?  "), null);
  assert.equal(validarPergunta("a".repeat(PERGUNTA_MAX)), null);
  assert.match(validarPergunta("a".repeat(PERGUNTA_MAX + 1)), /no máximo 500/);
});

test("exige resposta preenchida e dentro do limite", () => {
  assert.match(validarResposta("   "), /Escreva uma resposta/);
  assert.equal(validarResposta("Sim"), null);
  assert.match(validarResposta("a".repeat(RESPOSTA_MAX + 1)), /no máximo 1000/);
});

test("mescla páginas sem repetir perguntas", () => {
  const atuais = [{ id: "1" }, { id: "2" }];
  const novas = [{ id: "2" }, { id: "3" }];
  assert.deepEqual(mesclarPerguntas(atuais, novas), [{ id: "1" }, { id: "2" }, { id: "3" }]);
});

test("conta perguntas aguardando resposta e descreve o total", () => {
  assert.equal(contarPendentes([{ resposta: null }, { resposta: "Sim" }, { resposta: null }]), 2);
  assert.equal(descreverTotalPerguntas(1), "1 pergunta");
  assert.equal(descreverTotalPerguntas(4), "4 perguntas");
});

test("formata o tempo relativo da pergunta", () => {
  const agora = new Date("2026-10-27T15:00:00");
  assert.equal(formatarTempoRelativo("2026-10-27T14:59:40", agora), "agora mesmo");
  assert.equal(formatarTempoRelativo("2026-10-27T14:35:00", agora), "há 25 min");
  assert.equal(formatarTempoRelativo("2026-10-27T10:00:00", agora), "há 5 h");
  assert.equal(formatarTempoRelativo("2026-10-26T12:00:00", agora), "ontem");
  assert.equal(formatarTempoRelativo("2026-10-23T12:00:00", agora), "há 4 dias");
  assert.equal(formatarTempoRelativo("2026-09-02T12:00:00", agora), "02/09/2026");
  assert.equal(formatarTempoRelativo("data inválida", agora), "");
});
