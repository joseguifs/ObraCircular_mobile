import assert from "node:assert/strict";
import test from "node:test";

import { descreverConservacao, descreverEntrega, formatarQuantidade } from "./materiais.ts";

test("exibe a unidade do material com quantidades brasileiras e sem zeros extras", () => {
  assert.equal(formatarQuantidade("12.500", "M2"), "12,5 m²");
  assert.equal(formatarQuantidade("0.125", "KG"), "0,125 kg");
  assert.equal(formatarQuantidade(4, "CAIXA"), "4 caixas");
  assert.equal(formatarQuantidade("0.000"), "0 un.");
  assert.equal(descreverConservacao("NAO_INFORMADO"), "Não informado");
  assert.equal(descreverEntrega("RETIRADA_ENTREGA"), "Retirada ou entrega");
});
