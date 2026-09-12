/** Fixed-step simulation shared by the browser and the reward server. No browser APIs. */
export const VERSION = 3;
export const FPS = 60;
export type Kind =
  | "box"
  | "worm"
  | "ink"
  | "feather"
  | "platform"
  | "shield"
  | "magnet"
  | "clock"
  | "gift"
  | "accessory"
  | "coupon";
export type Input = { tick: number; held: boolean };
export type Thing = {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  taken: boolean;
  active?: boolean;
  sourceId?: number;
  flight?: number;
  originX?: number;
  originY?: number;
};
export type Run = {
  seed: number;
  tick: number;
  end: number;
  x: number;
  y: number;
  vy: number;
  ground: boolean;
  held: boolean;
  buffer: number;
  score: number;
  feathers: number;
  worms: number;
  boxes: number;
  hits: number;
  combo: number;
  bestCombo: number;
  shield: number;
  magnet: number;
  immune: number;
  things: Thing[];
  next: number;
  seq: number;
  rng: number;
  gifts: number[];
  items: number[];
  tickets: number[];
  notice: string;
  noticeUntil: number;
  effects: { x: number; y: number; until: number }[];
};
export function createRun(seed: number): Run {
  const r: Run = {
    seed,
    tick: 0,
    end: 3600,
    x: 0,
    y: 0,
    vy: 0,
    ground: true,
    held: false,
    buffer: 0,
    score: 0,
    feathers: 0,
    worms: 0,
    boxes: 0,
    hits: 0,
    combo: 0,
    bestCombo: 0,
    shield: 0,
    magnet: 0,
    immune: 0,
    things: [],
    next: 9,
    seq: 0,
    rng: seed >>> 0,
    gifts: [],
    items: [],
    tickets: [],
    notice: "Toque para pular. Segure para ir mais alto.",
    noticeUntil: 300,
    effects: [],
  };
  generate(r);
  return r;
}
function random(r: Run) {
  r.rng = (Math.imul(r.rng, 1664525) + 1013904223) >>> 0;
  return r.rng / 4294967296;
}
function add(r: Run, kind: Kind, x: number, y = 0, w = 1, h = 1) {
  r.things.push({ id: r.seq++, kind, x, y, w, h, taken: false });
}
function generate(r: Run) {
  while (r.next < r.x + 30) {
    const x = r.next,
      section = Math.floor(x / 16),
      pattern = section % 7;
    if (pattern === 0 || pattern === 1) {
      add(r, section % 5 === 1 ? "gift" : "box", x, 3.5, 1.3, 1);
      for (let i = 0; i < 5; i++)
        add(
          r,
          "feather",
          x + 3 + i * 0.85,
          0.6 + Math.sin((i / 4) * Math.PI) * 1.8,
          0.45,
          0.6,
        );
    } else if (pattern === 2) {
      add(r, "worm", x, 0, 1.2, 0.5);
      add(r, "worm", x + 5, 0, 1.2, 0.5);
      add(r, "shield", x + 9, 1.8, 0.8, 0.8);
    } else if (pattern === 3) {
      add(r, "platform", x, 1.1, 4, 0.35);
      for (let i = 0; i < 4; i++) add(r, "feather", x + i, 2.4, 0.45, 0.6);
      add(r, "ink", x + 7, 0, 1.4, 0.28);
    } else if (pattern === 4) {
      add(r, "ink", x, 0, 1.4, 0.28);
      add(r, "box", x + 6, 3.5, 1.3, 1);
      add(r, "magnet", x + 10, 0.9, 0.8, 0.8);
    } else if (pattern === 5) {
      for (let i = 0; i < 9; i++)
        add(r, "feather", x + i, i % 2 ? 2.4 : 0.7, 0.45, 0.6);
      add(r, "clock", x + 11, 1.7, 0.8, 0.8);
    } else {
      add(r, "gift", x, 3.5, 1.3, 1);
      add(r, "worm", x + 7, 0, 1.2, 0.5);
      add(r, "box", x + 11, 3.5, 1.3, 1);
    }
    r.next += 16 + random(r) * 2;
  }
}
function feedback(r: Run, text: string, x = r.x, y = r.y + 1) {
  r.notice = text;
  r.noticeUntil = r.tick + 95;
  r.effects.push({ x, y, until: r.tick + 24 });
}
export function stepRun(r: Run, held: boolean): void {
  if (r.tick >= r.end) return;
  r.tick++;
  const dt = 1 / FPS,
    speed = 5.1 + Math.min(r.tick / 3600, 1) * 1.1;
  if (held && !r.held) r.buffer = 9;
  r.held = held;
  if (r.buffer > 0 && r.ground) {
    r.vy = 12.9;
    r.ground = false;
    r.buffer = 0;
  }
  r.buffer = Math.max(0, r.buffer - 1);
  const oldY = r.y;
  r.vy -= (held && r.vy > 0 ? 25 : 39) * dt;
  r.x += speed * dt;
  r.y += r.vy * dt;
  r.ground = false;
  if (r.y <= 0) {
    r.y = 0;
    r.vy = 0;
    r.ground = true;
  }
  for (const o of r.things) {
    if (o.taken) continue;
    if (o.kind === "worm") {
      // Activation depends on world distance, never viewport size or render timing.
      if (o.x - r.x < 12) o.active = true;
      if (o.active) o.x -= 1.05 * dt;
    }
    if ((o.kind === "accessory" || o.kind === "coupon") && o.flight !== undefined && o.flight < 45) {
      o.flight++;
      const t = o.flight / 45;
      o.x = o.originX! + (o.kind === "coupon" ? 10 : 7) * t;
      o.y = t === 1 ? 0 : o.originY! * (1 - t) + 2 * Math.sin(Math.PI * t);
      // Only a landed piece can be worn: its flight never forces an outfit.
      continue;
    }
    const near = Math.abs(r.x - o.x) < (0.8 + o.w) / 2;
    if (o.kind === "platform") {
      const top = o.y + o.h;
      if (near && r.vy <= 0 && oldY >= top - 0.04 && r.y <= top) {
        r.y = top;
        r.vy = 0;
        r.ground = true;
      }
      continue;
    }
    if (o.kind === "box" || o.kind === "gift") {
      if (near && r.vy > 0 && oldY + 1.9 <= o.y && r.y + 1.9 >= o.y) {
        o.taken = true;
        r.vy = -2;
        r.boxes++;
        r.score += 50;
        r.things.push({
          id: r.seq++, kind: "accessory", x: o.x, y: o.y,
          w: 0.85, h: 0.85, taken: false,
          sourceId: o.id, flight: 0, originX: o.x, originY: o.y,
        });
        if (o.kind === "gift") {
          r.gifts.push(o.id);
          r.things.push({
            id: r.seq++, kind: "coupon", x: o.x, y: o.y,
            w: 1.2, h: 0.9, taken: false,
            sourceId: o.id, flight: 0, originX: o.x, originY: o.y,
          });
        }
        feedback(
          r,
          o.kind === "gift" ? "+50 · Um cupom surpresa! Pegue no caminho" : "+50 · Passe na peça para vestir; pule para deixar",
          o.x,
          o.y,
        );
      }
      continue;
    }
    if (o.kind === "worm") {
      if (near && r.vy < 0 && oldY >= o.h - 0.12 && r.y <= o.h) {
        o.taken = true;
        r.y = o.h;
        r.vy = 11.8;
        r.ground = false;
        r.worms++;
        r.combo++;
        r.bestCombo = Math.max(r.bestCombo, r.combo);
        r.score += 25 * Math.min(r.combo, 5);
        feedback(r, `Minhoca! Combo ×${r.combo}`, o.x, o.y);
      }
      continue;
    }
    if (o.kind === "ink") {
      if (near && r.y < o.h && r.immune < r.tick) {
        r.immune = r.tick + 100;
        if (r.shield > r.tick) {
          r.shield = 0;
          feedback(r, "Escudo salvou!");
        } else {
          r.hits++;
          r.combo = 0;
          r.score = Math.max(0, r.score - 20);
          feedback(r, "Tinta! −20 pontos");
        }
      }
      continue;
    }
    const touching = near && r.y < o.y + o.h && r.y + 1.9 > o.y;
    const attracted =
      o.kind === "feather" && r.magnet > r.tick && Math.abs(r.x - o.x) < 3.5;
    if (!touching && !attracted) continue;
    o.taken = true;
    if (o.kind === "coupon") {
      r.tickets.push(o.sourceId!);
      feedback(r, "Cupom coletado! Confira no final", o.x, o.y);
    }
    if (o.kind === "accessory") {
      r.items.push(o.sourceId!);
      feedback(r, "Peça vestida!", o.x, o.y);
    }
    if (o.kind === "feather") {
      r.feathers++;
      r.score += 10;
      feedback(r, "+10 · pena", o.x, o.y);
    }
    if (o.kind === "shield") {
      r.shield = r.tick + 600;
      feedback(r, "Proteção por 10 segundos");
    }
    if (o.kind === "magnet") {
      r.magnet = r.tick + 600;
      feedback(r, "Ímã de penas por 10 segundos");
    }
    if (o.kind === "clock") {
      r.end = Math.min(4200, r.end + 180);
      feedback(r, "Mais 3 segundos!");
    }
  }
  if (r.ground) r.combo = 0;
  r.things = r.things.filter((o) => o.x > r.x - 12);
  r.effects = r.effects.filter((p) => p.until > r.tick);
  generate(r);
}
export function replay(seed: number, inputs: Input[]): Run {
  const r = createRun(seed);
  let index = 0,
    held = false;
  while (r.tick < r.end) {
    if (inputs[index]?.tick === r.tick) held = inputs[index++].held;
    stepRun(r, held);
  }
  return r;
}
export function missions(r: Run) {
  return [
    { id: "penas", name: "Colete 20 penas", value: r.feathers, target: 20 },
    { id: "minhocas", name: "Pise em 3 minhocas", value: r.worms, target: 3 },
    { id: "caixas", name: "Abra 5 caixas", value: r.boxes, target: 5 },
    {
      id: "limpa",
      name: "Chegue sem tinta",
      value: r.tick >= r.end && r.hits === 0 ? 1 : 0,
      target: 1,
    },
  ];
}
