import test from "node:test";
import assert from "node:assert/strict";
import { createRun, stepRun, replay } from "../engine.mjs";
import {
  validateInputs,
  validateReward,
  eligible,
  weekKey,
} from "../validation.mjs";
const isolate = () => {
  const r = createRun(42);
  r.things = [];
  r.next = 1e6;
  return r;
};
const thing = (kind, x, y = 0, w = 1, h = 0.5) => ({
  id: 1,
  kind,
  x,
  y,
  w,
  h,
  taken: false,
});
test("same seed and input log replay identically, independent of rendering", () => {
  const r = createRun(781),
    inputs = [];
  let prior = false;
  while (r.tick < r.end) {
    const held = r.tick % 84 < 22;
    if (held !== prior) {
      inputs.push({ tick: r.tick, held });
      prior = held;
    }
    stepRun(r, held);
  }
  validateInputs(inputs);
  assert.deepEqual(replay(781, inputs), r);
});
test("short and held jumps have distinct heights", () => {
  const peak = (hold) => {
    const r = isolate();
    let max = 0;
    for (let t = 0; t < 100; t++) {
      stepRun(r, t < hold);
      max = Math.max(max, r.y);
    }
    return max;
  };
  assert.ok(peak(25) > peak(1) + 0.5);
});
test("worms move left and remain still until activation", () => {
  const r = isolate(),
    w = thing("worm", 20);
  r.things = [w];
  stepRun(r, false);
  assert.equal(w.x, 20);
  r.x = 10;
  stepRun(r, false);
  assert.ok(w.x < 20);
});
test("descending top contact stomps a worm and bounces; side contact does not", () => {
  const r = isolate();
  r.y = 0.55;
  r.vy = -5;
  r.ground = false;
  r.things = [thing("worm", 0.08)];
  stepRun(r, false);
  assert.equal(r.worms, 1);
  assert.ok(r.vy > 0);
  assert.equal(r.ground, false);
  const side = isolate();
  side.things = [thing("worm", 0.08)];
  stepRun(side, false);
  assert.equal(side.worms, 0);
});
test("box awards once, including gift eligibility", () => {
  const r = isolate();
  r.y = 1.55;
  r.vy = 10;
  r.ground = false;
  r.things = [thing("gift", 0.08, 3.5, 1.3, 1)];
  stepRun(r, true);
  assert.equal(r.boxes, 1);
  assert.equal(r.items.length, 0);
  assert.equal(r.things.filter(o => o.kind === "accessory").length, 1);
  assert.equal(r.gifts.length, 1);
  for (let i = 0; i < 20; i++) stepRun(r, false);
  assert.equal(r.boxes, 1);
});
test("platform landing and stepping off do not grant midair jumps", () => {
  const r = isolate();
  r.y = 1.5;
  r.vy = -4;
  r.ground = false;
  r.things = [thing("platform", 0, 1.1, 4, 0.35)];
  stepRun(r, false);
  assert.equal(r.ground, true);
  assert.equal(r.y, 1.4500000000000002);
  r.x = 4;
  stepRun(r, false);
  assert.equal(r.ground, false);
});
test("shield absorbs ink once; immunity prevents repeated damage", () => {
  const r = isolate();
  r.shield = 600;
  r.things = [thing("ink", 0, 0, 1.4, 0.28)];
  stepRun(r, false);
  assert.equal(r.hits, 0);
  assert.equal(r.shield, 0);
  for (let i = 0; i < 5; i++) stepRun(r, false);
  assert.equal(r.hits, 0);
  const naked = isolate();
  naked.score = 50;
  naked.things = [thing("ink", 0, 0, 1.4, 0.28)];
  stepRun(naked, false);
  assert.equal(naked.score, 30);
  stepRun(naked, false);
  assert.equal(naked.score, 30);
});
test("clock adds three seconds and cannot exceed seventy seconds", () => {
  const r = isolate();
  r.end = 4150;
  r.things = [thing("clock", 0, 1, 0.8, 0.8)];
  stepRun(r, false);
  assert.equal(r.end, 4200);
});
test("rejects out of order, repeated, malformed and excessive input", () => {
  for (const input of [
    [{ tick: 0, held: false }],
    [
      { tick: 3, held: true },
      { tick: 2, held: false },
    ],
    [{ tick: 1, held: "yes" }],
    [{ tick: 4200, held: true }],
    Array(1801).fill({ tick: 0, held: true }),
  ])
    assert.throws(() => validateInputs(input));
  assert.deepEqual(validateInputs([]), []);
});
const reward = {
  name: "5% na tattoo",
  description: "Presente do quintal",
  terms: "Não cumulativo",
  image: "",
  type: "percent",
  value: 5,
  active: true,
  starts: 0,
  ends: 0,
  validityDays: 30,
  stock: 10,
  chance: 10,
  perUser: 1,
  cooldownDays: 30,
  minBoxes: 1,
  mission: "",
};
test("validates reward percentage, money, time window and integer limits", () => {
  assert.equal(validateReward(reward).value, 5);
  for (const patch of [
    { value: 101 },
    { value: -1 },
    { stock: 1.2 },
    { chance: Infinity },
    { ends: 10, starts: 20 },
    { image: "javascript:alert(1)" },
    { terms: "" },
  ])
    assert.throws(() => validateReward({ ...reward, ...patch }));
});
test("eligibility enforces stock, campaign dates, user quota, cooldown and mission", () => {
  const r = { ...reward, issued: 0 },
    run = { boxes: 2 },
    now = 1e10;
  assert.ok(eligible(r, null, run, now, []));
  for (const patch of [
    { active: false },
    { issued: 10 },
    { starts: now + 1 },
    { ends: now - 1 },
    { minBoxes: 3 },
    { mission: "limpa" },
  ])
    assert.equal(eligible({ ...r, ...patch }, null, run, now, []), false);
  assert.equal(eligible(r, { count: 1, last: 0 }, run, now, []), false);
  assert.equal(
    eligible({ ...r, perUser: 2 }, { count: 1, last: now - 1 }, run, now, []),
    false,
  );
});
test("weekly rankings share a UTC Monday partition across year boundaries", () => {
  assert.equal(weekKey(Date.parse("2026-01-01T12:00:00Z")), "2025-12-29");
});

const openBox = () => {
  const r = isolate();
  r.y = 1.55; r.vy = 10; r.ground = false;
  r.things = [thing("box", 0.08, 3.5, 1.3, 1)];
  stepRun(r, true);
  return r;
};
test("piece flies ahead without equipping, then walking collects exactly once", () => {
  const r = openBox();
  for (let i = 0; i < 44; i++) stepRun(r, false);
  assert.deepEqual(r.items, []);
  const piece = r.things.find(o => o.kind === "accessory");
  assert.equal(piece.y, 0);
  assert.ok(piece.x > r.x + 2);
  for (let i = 0; i < 65; i++) stepRun(r, false);
  assert.deepEqual(r.items, [1]);
});
test("jumping over a dropped piece preserves outfit even with magnet active", () => {
  const r = openBox();
  r.items = [99]; r.magnet = 600;
  const piece = r.things.find(o => o.kind === "accessory");
  let jumped = false;
  for (let i = 0; i < 110; i++) {
    if (piece.flight === 45 && piece.x - r.x < 2.2) jumped = true;
    stepRun(r, jumped);
  }
  assert.deepEqual(r.items, [99]);
  assert.equal(piece.taken, false);
  assert.ok(r.x > piece.x + 1);
});

test("gift releases a visible coupon; opening alone does not collect it", () => {
  const r = isolate();
  r.y = 1.55; r.vy = 10; r.ground = false;
  r.things = [thing("gift", 0.08, 3.5, 1.3, 1)];
  stepRun(r, true);
  assert.deepEqual(r.tickets, []);
  assert.equal(r.things.filter(o => o.kind === "coupon").length, 1);
  for (let i = 0; i < 150; i++) stepRun(r, false);
  assert.deepEqual(r.tickets, [1]);
  assert.deepEqual(r.items, [1]);
});
test("jumping past a coupon does not grant it and magnet cannot collect it", () => {
  const r = isolate();
  const ticket = {...thing("coupon", 3, 0, 1.2, 0.9), sourceId: 7};
  r.things = [ticket]; r.magnet = 600;
  for (let i = 0; i < 90; i++) stepRun(r, true);
  assert.deepEqual(r.tickets, []);
  assert.equal(ticket.taken, false);
});
