// Explicit demo-only integration: no provider call and no production fallback.
import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
initializeApp({ projectId: 'demo-quintal' });
const db = getFirestore();
const base = 'http://127.0.0.1:5001/demo-quintal/southamerica-east1/';
async function account() {
 const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) }); return r.json();
}
async function call(name, data, token) {
 const r = await fetch(base + name, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ data }) }); return r.json();
}
test('orders require authentication, owner isolation and administrator authorization', async () => {
 const a = await account(), b = await account(); assert.ok(a.idToken); assert.ok(b.idToken);
 for (const name of ['createCheckout', 'listShopOrders', 'updateShopOrder']) assert.equal((await call(name, {}, null)).error.status, 'UNAUTHENTICATED');
 const id = 'a'.repeat(40), order = { id, uid: a.localId, created: Date.now(), status: 'pago', fulfillment: 'aguardando', total: 100, produtoNome: 'Fixture', quantidade: 1 };
 await db.doc(`shopOrders/${id}`).set(order);
 assert.ok((await call('listShopOrders', {}, a.idToken)).result.some(o => o.id === id));
 assert.ok(!(await call('listShopOrders', {}, b.idToken)).result.some(o => o.id === id));
 assert.equal((await call('listShopOrders', { admin: true }, b.idToken)).error.status, 'PERMISSION_DENIED');
 assert.equal((await call('updateShopOrder', { id, fulfillment: 'enviado' }, a.idToken)).error.status, 'PERMISSION_DENIED');
 await db.doc(`usuarios/${b.localId}`).set({ admin: true });
 assert.equal((await call('updateShopOrder', { id, fulfillment: 'em_producao' }, b.idToken)).result.ok, true);
 assert.equal((await db.doc(`shopOrders/${id}`).get()).data().fulfillment, 'em_producao');
 const direct = await fetch(`http://127.0.0.1:8080/v1/projects/demo-quintal/databases/(default)/documents/shopOrders/${id}`, { headers: { authorization: `Bearer ${a.idToken}` } });
 assert.equal(direct.status, 403);
});
