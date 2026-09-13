import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  quote,
  validSignature,
  confirmedPayment,
} from "../shop-validation.mjs";
const product = { ativo: true, tipo: "pronto", precoCentavos: 4500 };
const input = {
  quantidade: 2,
  endereco: "Rua de teste 12, Centro, São Paulo SP 01000-000",
};
const freight = { regiao: "São Paulo", precoCentavos: 1200 };
test("checkout ignores browser prices and calculates integer cents", () => {
  assert.equal(
    quote(product, { ...input, precoCentavos: 1, total: 1 }, freight).total,
    10200,
  );
});
test("rejects disabled products, invalid quantities, missing shipping and custom choices", () => {
  assert.throws(() => quote({ ...product, ativo: false }, input, freight));
  for (const quantidade of [0, -1, 1.5, 11, "2"])
    assert.throws(() => quote(product, { ...input, quantidade }, freight));
  assert.throws(() => quote(product, input, null));
  assert.throws(() =>
    quote(
      { ...product, tipo: "personalizavel", tamanhos: ["P"] },
      { ...input, tamanho: "G" },
      freight,
    ),
  );
});
test("studio services have no shipping fee or address", () => {
  const q = quote({ ...product, tipo: "flash" }, input, freight);
  assert.equal(q.total, 9000);
  assert.equal(q.endereco, "");
});
test("webhook verifies the exact signed payment ID and request", () => {
  const secret = "test-only-secret",
    ts = "1750000000",
    id = "123",
    request = "test-request";
  const v1 = createHmac("sha256", secret)
    .update(`id:${id};request-id:${request};ts:${ts};`)
    .digest("hex");
  assert.equal(validSignature(`ts=${ts},v1=${v1}`, request, id, secret), true);
  assert.equal(
    validSignature(`ts=${ts},v1=${v1}`, request, "999", secret),
    false,
  );
  assert.equal(validSignature("ts=1,v1=invalid", request, id, secret), false);
  assert.equal(validSignature("", request, id, secret), false);
});
test("payment must be approved for the exact order, amount and currency", () => {
  const order = { id: "order-1", total: 10200 };
  const payment = {
    external_reference: "order-1",
    currency_id: "BRL",
    transaction_amount: 102,
    status: "approved",
  };
  assert.equal(confirmedPayment(payment, order), true);
  for (const change of [
    { status: "pending" },
    { external_reference: "another" },
    { transaction_amount: 1 },
    { currency_id: "USD" },
  ])
    assert.equal(confirmedPayment({ ...payment, ...change }, order), false);
});

import { paymentTransition } from '../shop-payment.mjs';
test('confirmation decrements stock exactly once and duplicate payment alerts the admin', () => {
 const order = { id: 'order-1', total: 10200, quantidade: 2, paymentId: null };
 const product = { estoque: 3, reservas: { 'order-1': { quantidade: 2 }, another: { quantidade: 1 } } };
 const payment = { external_reference: 'order-1', currency_id: 'BRL', transaction_amount: 102, status: 'approved' };
 const first = paymentTransition(order, product, payment, '123', 1);
 assert.equal(first.product.estoque, 1); assert.equal(first.order.status, 'pago');
 assert.deepEqual(Object.keys(first.product.reservas), ['another']);
 const paid = { ...order, ...first.order };
 assert.deepEqual(paymentTransition(paid, product, payment, '123', 2), {});
 assert.ok(paymentTransition(paid, product, payment, '456', 2).alert);
 assert.equal(paymentTransition(order, { estoque: 0 }, payment, '123', 3).order.status, 'pago_revisar_estoque');
 assert.equal(paymentTransition(paid, product, { ...payment, status: 'refunded' }, '123', 4).order.status, 'reembolsado');
});
