import assert from "node:assert/strict";
import test from "node:test";

import {
  formatarPercentualTaxa,
  formatarValor,
  obterEtiquetaRepasse,
  podeMarcarComoRepassado,
  somarValorPendente,
} from "./repasses.ts";

const pendente = { status: "PENDENTE", pedido_status: "PAGO", chave_pix: "maria@example.com", alerta_reembolso: false };

// O Intl usa espaço não separável entre "R$" e o número.
const semEspacoEspecial = (texto) => texto.replace(/\s/g, " ");

test("formata valores em reais, inclusive zero", () => {
  assert.equal(semEspacoEspecial(formatarValor("96.00")), "R$ 96,00");
  assert.equal(semEspacoEspecial(formatarValor("0.00")), "R$ 0,00");
  assert.equal(semEspacoEspecial(formatarValor(1234.5)), "R$ 1.234,50");
  assert.equal(formatarValor("abc"), "-");
});

test("calcula o percentual da taxa a partir dos valores gravados", () => {
  assert.equal(formatarPercentualTaxa("120.00", "24.00"), "20%");
  assert.equal(formatarPercentualTaxa("99.99", "12.50"), "12,5%");
  assert.equal(formatarPercentualTaxa("10.00", "0.00"), "0%");
  assert.equal(formatarPercentualTaxa("0", "0"), null);
});

test("escolhe a etiqueta conforme a situação do repasse", () => {
  assert.deepEqual(obterEtiquetaRepasse(pendente), { rotulo: "A repassar", tom: "neutro" });
  assert.deepEqual(obterEtiquetaRepasse({ ...pendente, chave_pix: null }), { rotulo: "Sem chave Pix", tom: "alerta" });
  assert.deepEqual(obterEtiquetaRepasse({ ...pendente, status: "PAGO" }), { rotulo: "Repassado", tom: "sucesso" });
  assert.deepEqual(
    obterEtiquetaRepasse({ ...pendente, status: "PAGO", pedido_status: "REEMBOLSADO", alerta_reembolso: true }),
    { rotulo: "Reembolsado após repasse", tom: "erro" },
  );
});

test("só libera o botão para pedido pago, pendente e com chave Pix", () => {
  assert.equal(podeMarcarComoRepassado(pendente), true);
  assert.equal(podeMarcarComoRepassado({ ...pendente, chave_pix: null }), false);
  assert.equal(podeMarcarComoRepassado({ ...pendente, status: "PAGO" }), false);
  assert.equal(podeMarcarComoRepassado({ ...pendente, pedido_status: "REEMBOLSADO" }), false);
});

test("soma apenas os valores ainda não repassados, sem erro de arredondamento", () => {
  const repasses = [
    { ...pendente, valor_liquido: "0.10" },
    { ...pendente, valor_liquido: "0.20" },
    { ...pendente, status: "PAGO", valor_liquido: "96.00" },
  ];
  assert.equal(somarValorPendente(repasses), 0.3);
  assert.equal(somarValorPendente([]), 0);
});
