import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { randomBytes, randomInt, createHmac } from "node:crypto";
import { replay, missions, VERSION } from "./engine.mjs";
import {
  validateInputs,
  validateReward,
  eligible,
  weekKey,
} from "./validation.mjs";
initializeApp();
const db = getFirestore(),
  options = { region: "southamerica-east1", maxInstances: 5 };
function uid(req) {
  if (!req.auth)
    throw new HttpsError(
      "unauthenticated",
      "Entre na sua conta para participar.",
    );
  return req.auth.uid;
}
async function admin(req) {
  const id = uid(req);
  if (!(await db.doc(`usuarios/${id}`).get()).data()?.admin)
    throw new HttpsError("permission-denied", "Acesso exclusivo do Vital.");
  return id;
}
const bad = (e) => new HttpsError("invalid-argument", e.message);

export const beginRun = onCall(options, async (req) => {
  const user = uid(req),
    now = Date.now(),
    ref = db.collection("gameRuns").doc(),
    seed = randomInt(0, 2147483647);
  const gate = db.doc(`gamePlayers/${user}`),
    day = new Date(now).toISOString().slice(0, 10);
  await db.runTransaction(async (tx) => {
    const p = (await tx.get(gate)).data() ?? {};
    if (p.lastStart && now - p.lastStart < 55000)
      throw new HttpsError(
        "resource-exhausted",
        "Espere um minuto antes de iniciar outra corrida premiada.",
      );
    const count = p.day === day ? (p.starts ?? 0) : 0;
    if (count >= 100)
      throw new HttpsError(
        "resource-exhausted",
        "Limite diário de corridas premiadas atingido.",
      );
    tx.set(
      gate,
      { day, starts: count + 1, lastStart: now, active: ref.id },
      { merge: true },
    );
    tx.set(ref, {
      uid: user,
      seed,
      version: VERSION,
      created: now,
      secret: randomBytes(24).toString("hex"),
      done: false,
    });
  });
  return { id: ref.id, seed, version: VERSION };
});

export const finishRun = onCall(options, async (req) => {
  const user = uid(req),
    { id, inputs } = req.data ?? {};
  if (typeof id !== "string" || !/^\w{20}$/.test(id))
    throw new HttpsError("invalid-argument", "Partida inválida.");
  try {
    validateInputs(inputs);
  } catch (e) {
    throw bad(e);
  }
  const ref = db.doc(`gameRuns/${id}`),
    snap = await ref.get(),
    session = snap.data(),
    now = Date.now();
  if (!session || session.uid !== user)
    throw new HttpsError("permission-denied", "Partida não encontrada.");
  if (session.done) return session.result;
  if (session.version !== VERSION)
    throw new HttpsError(
      "failed-precondition",
      "Atualize o jogo para participar.",
    );
  const run = replay(session.seed, inputs);
  if (
    now - session.created < (run.end / 60) * 1000 - 1500 ||
    now - session.created > 30 * 60000
  )
    throw new HttpsError(
      "failed-precondition",
      "O tempo desta partida não é válido. Jogue novamente.",
    );
  const rewardDocs = await db
    .collection("gameRewards")
    .where("active", "==", true)
    .get();
  const candidates = rewardDocs.docs
    .map((d) => d.ref)
    .sort((a, b) =>
      createHmac("sha256", session.secret)
        .update("order:" + a.id)
        .digest("hex")
        .localeCompare(
          createHmac("sha256", session.secret)
            .update("order:" + b.id)
            .digest("hex"),
        ),
    );
  const code = "QUINTAL-" + randomBytes(8).toString("hex").toUpperCase();
  return db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data();
    if (current.done) return current.result;
    const playerRef = db.doc(`gamePlayers/${user}`),
      player = (await tx.get(playerRef)).data();
    if (player?.active !== id)
      throw new HttpsError(
        "failed-precondition",
        "Outra corrida foi iniciada. Jogue novamente.",
      );
    const weekRef = db.doc(`gameWeeks/${weekKey(now)}/scores/${user}`),
      previous = (await tx.get(weekRef)).data();
    const completed = missions(run)
      .filter((m) => m.value >= m.target)
      .map((m) => m.id);
    const reads = [];
    for (const rewardRef of candidates) {
      const reward = (await tx.get(rewardRef)).data(),
        usageRef = db.doc(`gamePlayers/${user}/rewards/${rewardRef.id}`),
        usage = (await tx.get(usageRef)).data();
      reads.push({ rewardRef, reward, usageRef, usage });
    }
    const coupons = [];
    for (const { rewardRef, reward: r, usageRef, usage } of reads) {
      if (!r || !run.tickets.length || !eligible(r, usage, run, now, completed))
        continue;
      const roll =
        parseInt(
          createHmac("sha256", session.secret)
            .update(rewardRef.id)
            .digest("hex")
            .slice(0, 8),
          16,
        ) / 4294967296;
      const chance = 1 - Math.pow(1 - r.chance / 100, run.tickets.length);
      if (roll >= chance) continue;
      const coupon = {
        code,
        uid: user,
        rewardId: rewardRef.id,
        name: r.name,
        description: r.description,
        image: r.image,
        terms: r.terms,
        type: r.type,
        value: r.value,
        created: now,
        expires: now + r.validityDays * 86400000,
        usedAt: null,
      };
      coupons.push(coupon);
      tx.create(db.doc(`gameCoupons/${code}`), coupon);
      tx.update(rewardRef, { issued: r.issued + 1 });
      tx.set(usageRef, { count: (usage?.count ?? 0) + 1, last: now });
      break; // Benefits do not stack: at most one commercial coupon per run.
    }
    const result = { score: run.score, coupons };
    tx.update(ref, {
      done: true,
      result,
      completed,
      finished: now,
      boxes: run.boxes,
      gifts: run.gifts.length,
      tickets: run.tickets.length,
    });
    tx.set(
      playerRef,
      {
        best: Math.max(player?.best ?? 0, run.score),
        finished: (player?.finished ?? 0) + 1,
      },
      { merge: true },
    );
    if (run.score > (previous?.score ?? -1))
      tx.set(weekRef, {
        score: run.score,
        alias:
          "Artista " +
          createHmac("sha256", "quintal-public-alias")
            .update(user)
            .digest("hex")
            .slice(0, 6)
            .toUpperCase(),
      });
    return result;
  });
});

export const saveGameReward = onCall(options, async (req) => {
  await admin(req);
  let value;
  try {
    value = validateReward(req.data);
  } catch (e) {
    throw bad(e);
  }
  const id = req.data.id;
  if (id && (typeof id !== "string" || !/^\w{1,80}$/.test(id)))
    throw new HttpsError("invalid-argument", "Identificador inválido.");
  const ref = id
    ? db.doc(`gameRewards/${id}`)
    : db.collection("gameRewards").doc();
  await db.runTransaction(async (tx) => {
    const old = (await tx.get(ref)).data();
    if (value.stock < (old?.issued ?? 0))
      throw new HttpsError(
        "invalid-argument",
        "Quantidade menor que os cupons já emitidos.",
      );
    tx.set(ref, { ...value, issued: old?.issued ?? 0, used: old?.used ?? 0 });
  });
  return { id: ref.id };
});
export const redeemGameCoupon = onCall(options, async (req) => {
  const actor = await admin(req),
    code = String(req.data?.code ?? "")
      .trim()
      .toUpperCase();
  if (!/^QUINTAL-[A-F0-9]{16}$/.test(code))
    throw new HttpsError("invalid-argument", "Código inválido.");
  const ref = db.doc(`gameCoupons/${code}`);
  return db.runTransaction(async (tx) => {
    const coupon = (await tx.get(ref)).data();
    if (!coupon) throw new HttpsError("not-found", "Cupom não encontrado.");
    if (coupon.usedAt)
      throw new HttpsError("failed-precondition", "Cupom já utilizado.");
    if (coupon.expires < Date.now())
      throw new HttpsError("failed-precondition", "Cupom expirado.");
    const rewardRef = db.doc(`gameRewards/${coupon.rewardId}`),
      reward = (await tx.get(rewardRef)).data();
    const usedAt = Date.now();
    tx.update(ref, { usedAt, usedBy: actor });
    if (reward) tx.update(rewardRef, { used: (reward.used ?? 0) + 1 });
    return { ...coupon, usedAt };
  });
});
