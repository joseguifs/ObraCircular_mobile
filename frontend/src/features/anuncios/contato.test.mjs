import assert from "node:assert/strict";
import test from "node:test";

import { obterContatoVendedor } from "./contato.ts";

const anuncio = { id: "28d86685-7edb-4cd3-a11e-0ac46c804577", titulo: "Piso cerâmico", status: "ATIVO" };
const vendedor = { telefone: "+5563991234567", status: "ATIVO" };

test("normaliza celulares e telefones fixos nacionais com ou sem código do Brasil", () => {
  for (const telefone of ["63991234567", "(63) 99123-4567", "+55 (63) 99123-4567", "5563991234567", "  +55 63 99123.4567  "]) {
    const contato = obterContatoVendedor(anuncio, { ...vendedor, telefone });
    assert.equal(new URL(contato.url).pathname, "/5563991234567", telefone);
    assert.equal(contato.indisponibilidade, null);
  }
  for (const telefone of ["6332123456", "+556332123456", "556332123456"]) {
    assert.equal(new URL(obterContatoVendedor(anuncio, { ...vendedor, telefone }).url).pathname, "/556332123456");
  }
});

test("preserva DDD 55 sem confundir com o código internacional", () => {
  assert.equal(new URL(obterContatoVendedor(anuncio, { ...vendedor, telefone: "55991234567" }).url).pathname, "/5555991234567");
  assert.equal(new URL(obterContatoVendedor(anuncio, { ...vendedor, telefone: "5532123456" }).url).pathname, "/555532123456");
});

test("codifica o título como texto e identifica o anúncio na mensagem", () => {
  const titulo = 'Telhas & conexões #1? text=outro / "azul" 🧱';
  const contato = obterContatoVendedor({ ...anuncio, titulo }, vendedor);
  const url = new URL(contato.url);
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.hash, "");
  assert.deepEqual([...url.searchParams.keys()], ["text"]);
  assert.equal(url.searchParams.get("text"), `Olá! Vi o anúncio "${titulo}" no ObraCircular e tenho interesse. O material ainda está disponível?\nCódigo do anúncio: ${anuncio.id}`);
});

test("bloqueia contato ausente, incompleto, estrangeiro ou malformado", () => {
  for (const telefone of [null, "", " ", "991234567", "063991234567", "+1 202 555 0123", "1234567890123", "00000000000", "abc63991234567", "63991234567 ramal 2", "63991234567?text=x", "++5563991234567"]) {
    const contato = obterContatoVendedor(anuncio, { ...vendedor, telefone });
    assert.equal(contato.url, null, String(telefone));
    assert.match(contato.indisponibilidade, /telefone brasileiro válido/);
  }
});

test("não oferece negociação de anúncios esgotados ou encerrados", () => {
  for (const status of ["ESGOTADO", "ENCERRADO"]) {
    const contato = obterContatoVendedor({ ...anuncio, status }, vendedor);
    assert.equal(contato.url, null);
    assert.match(contato.indisponibilidade, /anúncio não está mais disponível/);
  }
});

test("não oferece contato de vendedores inativos ou bloqueados", () => {
  for (const status of ["INATIVO", "BLOQUEADO"]) {
    const contato = obterContatoVendedor(anuncio, { ...vendedor, status });
    assert.equal(contato.url, null);
    assert.match(contato.indisponibilidade, /contato deste vendedor está indisponível/);
  }
});
