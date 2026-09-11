import test from "node:test";
import assert from "node:assert/strict";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRun, stepRun } from "../engine.mjs";
// Run only against the named demo project. No production fallback is permitted.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
initializeApp({ projectId: "demo-quintal" });
const db = getFirestore();
const base = "http://127.0.0.1:5001/demo-quintal/southamerica-east1/";
async function account() {
  const r = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  const b = await r.json();
  assert.ok(b.idToken);
  return { uid: b.localId, token: b.idToken };
}
async function callable(name, data, token) {
  const r = await fetch(base + name, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ data }),
  });
  return { status: r.status, ...(await r.json()) };
}
function commands(seed) {
  const r = createRun(seed),
    inputs = [];
  let held = false,
    release = 0;
  while (r.tick < r.end) {
    let desired = held;
    if (r.tick >= release) desired = false;
    const target = r.things.find(
      (o) =>
        !o.taken &&
        ["box", "gift"].includes(o.kind) &&
        o.x - r.x > 0 &&
        o.x - r.x < 1.4,
    );
    if (r.ground && target && !held) {
      desired = true;
      release = r.tick + 15;
    }
    if (desired !== held) {
      inputs.push({ tick: r.tick, held: desired });
      held = desired;
    }
    stepRun(r, held);
  }
  assert.ok(r.gifts.length > 0);
  return { inputs, run: r };
}
test("real emulator: permissions, replay, idempotent issuance, stock, wallet isolation and redemption", async () => {
  const oldRewards = await db.collection("gameRewards").get();
  for (const d of oldRewards.docs) await d.ref.update({ active: false });
  const a = await account(),
    b = await account(),
    owner = await account();
  await db
    .doc(`usuarios/${owner.uid}`)
    .set({ admin: true, nome: "Admin de teste" });
  const reward = {
    id: "test_stock",
    name: "5% teste",
    description: "Somente emulador",
    terms: "Não cumulativo",
    image: "",
    type: "percent",
    value: 5,
    active: true,
    starts: 0,
    ends: 0,
    validityDays: 30,
    stock: 1,
    chance: 100,
    perUser: 1,
    cooldownDays: 30,
    minBoxes: 1,
    mission: "",
  };
  await db.doc("gameRewards/test_stock").delete();
  assert.equal((await callable("beginRun", {}, null)).status, 401);
  assert.equal((await callable("saveGameReward", reward, a.token)).status, 403);
  assert.equal(
    (await callable("saveGameReward", reward, owner.token)).status,
    200,
  );
  const start = await callable("beginRun", {}, a.token);
  assert.equal(start.status, 200);
  const { id, seed } = start.result,
    log = commands(seed);
  await db.doc(`gameRuns/${id}`).update({ created: Date.now() - 100000 });
  const [first, retry] = await Promise.all([
    callable("finishRun", { id, inputs: log.inputs, score: 999999 }, a.token),
    callable("finishRun", { id, inputs: log.inputs }, a.token),
  ]);
  assert.equal(first.status, 200);
  assert.deepEqual(first.result, retry.result);
  assert.equal(first.result.score, log.run.score);
  assert.equal(first.result.coupons.length, 1);
  const code = first.result.coupons[0].code;
  assert.equal((await db.doc("gameRewards/test_stock").get()).data().issued, 1);
  const second = await callable("beginRun", {}, b.token),
    secondLog = commands(second.result.seed);
  await db
    .doc(`gameRuns/${second.result.id}`)
    .update({ created: Date.now() - 100000 });
  const empty = await callable(
    "finishRun",
    { id: second.result.id, inputs: secondLog.inputs },
    b.token,
  );
  assert.equal(empty.result.coupons.length, 0);
  assert.equal(
    (await callable("redeemGameCoupon", { code }, a.token)).status,
    403,
  );
  assert.equal(
    (await callable("redeemGameCoupon", { code }, owner.token)).status,
    200,
  );
  assert.equal(
    (await callable("redeemGameCoupon", { code }, owner.token)).status,
    400,
  );
  const firestore =
    "http://127.0.0.1:8080/v1/projects/demo-quintal/databases/(default)/documents/";
  const privateRead = await fetch(firestore + "gameCoupons/" + code, {
    headers: { authorization: `Bearer ${b.token}` },
  });
  assert.equal(privateRead.status, 403);
  const promote = await fetch(firestore + "usuarios/" + b.uid, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${b.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ fields: { admin: { booleanValue: true } } }),
  });
  assert.equal(promote.status, 403);
  const forge = await fetch(firestore + "gameCoupons/FORGED", {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${a.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ fields: { uid: { stringValue: a.uid } } }),
  });
  assert.equal(forge.status, 403);
  const regular = await fetch(firestore + "usuarios/" + b.uid, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${b.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      fields: { nome: { stringValue: "Pessoa de teste" } },
    }),
  });
  assert.equal(regular.status, 200);
});
