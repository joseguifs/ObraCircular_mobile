import assert from "node:assert/strict";
import test from "node:test";

import { listarAcoesAnuncio, listarAcoesUsuario, normalizarCategoria, validarCategoria } from "./acoes.ts";

const usuario = { id: "u1", status: "ATIVO", papel: "USUARIO", deletado_em: null };

test("oferece ações conforme o status e o papel do usuário", () => {
  assert.deepEqual(listarAcoesUsuario(usuario, "admin"), ["inativar", "bloquear", "promover", "excluir"]);
  assert.deepEqual(
    listarAcoesUsuario({ ...usuario, status: "BLOQUEADO", papel: "ADMIN" }, "admin"),
    ["ativar", "rebaixar", "excluir"],
  );
  assert.deepEqual(listarAcoesUsuario({ ...usuario, status: "INATIVO" }, "admin"), [
    "ativar",
    "bloquear",
    "promover",
    "excluir",
  ]);
});

test("não permite que o admin altere a própria conta", () => {
  assert.deepEqual(listarAcoesUsuario(usuario, "u1"), []);
});

test("usuários e anúncios excluídos só podem ser restaurados", () => {
  assert.deepEqual(listarAcoesUsuario({ ...usuario, deletado_em: "2026-10-13" }, "admin"), ["restaurar"]);
  assert.deepEqual(listarAcoesAnuncio({ status: "ATIVO", deletado_em: "2026-10-13" }), ["restaurar"]);
});

test("alterna entre encerrar e reativar anúncios", () => {
  assert.deepEqual(listarAcoesAnuncio({ status: "ATIVO", deletado_em: null }), ["encerrar", "excluir"]);
  assert.deepEqual(listarAcoesAnuncio({ status: "ESGOTADO", deletado_em: null }), ["encerrar", "excluir"]);
  assert.deepEqual(listarAcoesAnuncio({ status: "ENCERRADO", deletado_em: null }), ["reativar", "excluir"]);
});

test("normaliza e valida os dados da categoria", () => {
  assert.deepEqual(normalizarCategoria({ nome: "  Vidros   e  espelhos ", descricao: "   " }), {
    nome: "Vidros e espelhos",
    descricao: null,
  });
  assert.deepEqual(validarCategoria({ nome: "Vidros", descricao: "" }), {});
  assert.equal(validarCategoria({ nome: "   ", descricao: "" }).nome, "Informe o nome da categoria.");
  assert.ok(validarCategoria({ nome: "a".repeat(101), descricao: "" }).nome);
  assert.ok(validarCategoria({ nome: "Vidros", descricao: "a".repeat(256) }).descricao);
});
