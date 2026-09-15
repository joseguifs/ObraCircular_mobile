import assert from "node:assert/strict";
import test from "node:test";

import {
  descreverStatusAnuncio,
  descreverStatusUsuario,
  ehIdentificadorValido,
  formatarData,
  formatarMembroDesde,
  formatarPreco,
  formatarTelefone,
  obterIniciais,
  resumirAnuncios,
  resumirLocalizacao,
} from "./perfil.ts";

test("aceita somente identificadores no formato UUID", () => {
  assert.equal(ehIdentificadorValido("8f14e45f-ceea-467a-9c36-1a2b3c4d5e6f"), true);
  assert.equal(ehIdentificadorValido("42"), false);
  assert.equal(ehIdentificadorValido(""), false);
});

test("gera as iniciais com o primeiro e o último nome", () => {
  assert.equal(obterIniciais("Matheus Felipe Lopes Valadares"), "MV");
  assert.equal(obterIniciais("  ana  "), "A");
  assert.equal(obterIniciais("érica souza"), "ÉS");
  assert.equal(obterIniciais("   "), "?");
});

test("formata o telefone salvo pela API", () => {
  assert.equal(formatarTelefone("+5563999998888"), "(63) 99999-8888");
  assert.equal(formatarTelefone("+556332145678"), "(63) 3214-5678");
  assert.equal(formatarTelefone("+5555999998888"), "(55) 99999-8888");
  assert.equal(formatarTelefone(null), null);
});

test("formata as datas recebidas da API", () => {
  assert.equal(formatarMembroDesde("2026-09-15T12:00:00Z"), "setembro de 2026");
  assert.equal(formatarData("2026-03-05T12:00:00.123456Z"), "05/03/2026");
  assert.equal(formatarData("data inválida"), null);
  assert.equal(formatarMembroDesde("data inválida"), null);
});

test("formata o preço e identifica doações", () => {
  assert.match(formatarPreco("1234.50"), /1\.234,50/);
  assert.equal(formatarPreco("0.00"), "Doação");
});

test("resume os anúncios e a localização do usuário", () => {
  assert.deepEqual(
    resumirAnuncios([
      { status: "ATIVO" },
      { status: "ESGOTADO" },
      { status: "ENCERRADO" },
      { status: "ATIVO" },
    ]),
    { total: 4, ativos: 2, finalizados: 2 },
  );
  assert.equal(
    resumirLocalizacao([
      { cidade: "Palmas", estado: "TO" },
      { cidade: "Palmas", estado: "TO" },
      { cidade: "Porto Nacional", estado: "TO" },
    ]),
    "Palmas/TO · Porto Nacional/TO",
  );
  assert.equal(resumirLocalizacao([]), null);
});

test("descreve os status de usuário e de anúncio", () => {
  assert.deepEqual(descreverStatusUsuario("BLOQUEADO"), { rotulo: "Conta bloqueada", tom: "erro" });
  assert.deepEqual(descreverStatusAnuncio("ESGOTADO"), { rotulo: "Esgotado", tom: "alerta" });
  assert.deepEqual(descreverStatusAnuncio("DESCONHECIDO"), { rotulo: "DESCONHECIDO", tom: "neutro" });
});
