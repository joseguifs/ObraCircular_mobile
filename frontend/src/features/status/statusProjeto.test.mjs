import assert from "node:assert/strict";
import test from "node:test";

import { apiEstaSaudavel, descreverSituacaoApi } from "./statusProjeto.ts";

test("reconhece apenas a resposta esperada do endpoint de saúde", () => {
  assert.equal(apiEstaSaudavel({ status: "ok" }), true);
  assert.equal(apiEstaSaudavel({ status: "erro" }), false);
  assert.equal(apiEstaSaudavel(null), false);
});

test("descreve os estados de disponibilidade da API", () => {
  assert.equal(descreverSituacaoApi("verificando").titulo, "Verificando serviços");
  assert.equal(descreverSituacaoApi("online").tom, "sucesso");
  assert.equal(descreverSituacaoApi("offline").tom, "alerta");
});
