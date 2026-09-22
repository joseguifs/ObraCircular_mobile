import assert from "node:assert/strict";
import test from "node:test";

import { normalizarEdicaoUsuario, obterAlteracoesUsuario, validarEdicaoUsuario } from "./edicao.ts";

const usuario = {
  nome: "Matheus Felipe",
  email: "matheus@example.com",
  telefone: "+5563999998888",
};
const dados = { ...usuario, telefone: "(63) 99999-8888" };

test("aceita os dados básicos já cadastrados, inclusive telefone internacional", () => {
  assert.deepEqual(validarEdicaoUsuario(dados), {});
  assert.deepEqual(validarEdicaoUsuario(usuario), {});
});

test("normaliza espaços do nome, caixa do e-mail e telefone brasileiro", () => {
  assert.deepEqual(
    normalizarEdicaoUsuario({
      nome: "  Matheus   Felipe  ",
      email: " MATHEUS@EXAMPLE.COM ",
      telefone: "(63) 99999-8888",
    }),
    usuario,
  );
});

test("valida nome vazio, curto e acima do limite do backend", () => {
  for (const nome of ["", "   ", "Ab", "a".repeat(151)]) {
    assert.ok(validarEdicaoUsuario({ ...dados, nome }).nome);
  }
  assert.equal(validarEdicaoUsuario({ ...dados, nome: "a".repeat(150) }).nome, undefined);
});

test("rejeita e-mail vazio, inválido e longo", () => {
  for (const email of [
    "",
    "sem-arroba",
    "a@@exemplo.com",
    "a b@exemplo.com",
    "a@exemplo",
    `${"a".repeat(245)}@example.com`,
  ]) {
    assert.ok(validarEdicaoUsuario({ ...dados, email }).email);
  }
});

test("aceita fixo, celular, código do país e DDD 55 sem remover o DDD", () => {
  for (const telefone of [
    "(63) 3214-5678",
    "63999998888",
    "+55 (63) 99999-8888",
    "+5555999998888",
    "55999998888",
  ]) {
    assert.equal(validarEdicaoUsuario({ ...dados, telefone }).telefone, undefined);
  }
  assert.equal(
    normalizarEdicaoUsuario({ ...dados, telefone: "55999998888" }).telefone,
    "+5555999998888",
  );
});

test("rejeita telefone incompleto, só pontuação e tamanho fora do contrato", () => {
  for (const telefone of ["123", "() -", "123456789012", "12345678901234", " ".repeat(21)]) {
    assert.ok(validarEdicaoUsuario({ ...dados, telefone }).telefone);
  }
});

test("envia null somente quando o usuário remove o telefone", () => {
  assert.deepEqual(validarEdicaoUsuario({ ...dados, telefone: "" }), {});
  assert.deepEqual(obterAlteracoesUsuario({ ...dados, telefone: "" }, usuario), { telefone: null });
  assert.deepEqual(obterAlteracoesUsuario({ ...dados, telefone: "  " }, usuario), {
    telefone: null,
  });
});

test("não envia campos sem mudança nem alterações de formatação", () => {
  assert.deepEqual(obterAlteracoesUsuario(dados, usuario), {});
  assert.deepEqual(
    obterAlteracoesUsuario(
      { ...dados, nome: " Matheus   Felipe ", email: "MATHEUS@example.com" },
      usuario,
    ),
    {},
  );
  assert.deepEqual(
    obterAlteracoesUsuario({ ...dados, telefone: "" }, { ...usuario, telefone: null }),
    {},
  );
});

test("PATCH inclui somente dados básicos alterados, sem senha, status ou id", () => {
  assert.deepEqual(
    obterAlteracoesUsuario(
      {
        ...dados,
        nome: "Matheus Valadares",
        senha: "não enviar",
        status: "BLOQUEADO",
        id: "outro",
      },
      usuario,
    ),
    { nome: "Matheus Valadares" },
  );
  assert.deepEqual(obterAlteracoesUsuario({ ...dados, email: " NOVO@example.com " }, usuario), {
    email: "novo@example.com",
  });
});
