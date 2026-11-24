import assert from "node:assert/strict";
import test from "node:test";

import {
  descreverStatusPedido,
  formatarTempoRestante,
  obterDisponibilidadeCompra,
  pedidoEmAndamento,
  uriImagemQrCode,
} from "./pagamento.ts";

const comprador = "0b6f6d1e-3f5a-4c55-9b0e-2c1d2e3f4a5b";
const anuncio = { vendedor_id: "28d86685-7edb-4cd3-a11e-0ac46c804577", status: "ATIVO", preco: "120.00" };

test("permite comprar anúncio ativo de outro vendedor", () => {
  assert.deepEqual(obterDisponibilidadeCompra(anuncio, comprador), { disponivel: true, motivo: null });
});

test("exige usuário identificado", () => {
  for (const usuario of [undefined, "", "abc"]) {
    const resultado = obterDisponibilidadeCompra(anuncio, usuario);
    assert.equal(resultado.disponivel, false);
    assert.match(resultado.motivo, /Entre na sua conta/);
  }
});

test("bloqueia compra do próprio anúncio, indisponíveis e doações", () => {
  assert.match(obterDisponibilidadeCompra(anuncio, anuncio.vendedor_id.toUpperCase()).motivo, /é seu/);
  assert.match(obterDisponibilidadeCompra({ ...anuncio, status: "ESGOTADO" }, comprador).motivo, /não está disponível/);
  assert.match(obterDisponibilidadeCompra({ ...anuncio, preco: "0" }, comprador).motivo, /Doação/);
  assert.match(obterDisponibilidadeCompra({ ...anuncio, preco: "abc" }, comprador).motivo, /Doação/);
});

test("descreve os status do pedido", () => {
  assert.equal(descreverStatusPedido("PAGO").tom, "sucesso");
  assert.equal(descreverStatusPedido("AGUARDANDO_PAGAMENTO").rotulo, "Aguardando Pix");
  assert.equal(descreverStatusPedido("EXPIRADO").tom, "erro");
  assert.equal(descreverStatusPedido("QUALQUER").rotulo, "Status desconhecido");
  assert.equal(pedidoEmAndamento("AGUARDANDO_PAGAMENTO"), true);
  assert.equal(pedidoEmAndamento("PAGO"), false);
});

test("formata o tempo restante para pagar", () => {
  const agora = Date.parse("2026-11-24T12:00:00Z");
  assert.equal(formatarTempoRestante("2026-11-24T12:30:00Z", agora), "30:00");
  assert.equal(formatarTempoRestante("2026-11-24T12:00:09.900Z", agora), "00:09");
  assert.equal(formatarTempoRestante("2026-11-24T13:05:07Z", agora), "1:05:07");
  assert.equal(formatarTempoRestante("2026-11-24T12:00:00Z", agora), null);
  assert.equal(formatarTempoRestante("data inválida", agora), null);
});

test("monta a imagem do QR code a partir do base64", () => {
  assert.equal(uriImagemQrCode("iVBORw0KGgo="), "data:image/png;base64,iVBORw0KGgo=");
  assert.equal(uriImagemQrCode("data:image/png;base64,abc"), "data:image/png;base64,abc");
  assert.equal(uriImagemQrCode(null), null);
  assert.equal(uriImagemQrCode("  "), null);
});
