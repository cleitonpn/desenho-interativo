/** Fixed-step simulation shared by the browser and the reward server. No browser APIs. */
export const VERSION = 4;
export const FPS = 60;
export const BASE_TICKS = 120 * FPS;
export const MAX_TICKS = 130 * FPS;
export const difficulty = (r: Run) => Math.min(2, Math.floor(r.tick / (40 * FPS)));
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
  platforms: number[];
  notice: string;
  noticeUntil: number;
  effects: { x: number; y: number; until: number }[];
};
export function createRun(seed: number): Run {
  const r: Run = {
    seed,
    tick: 0,
    end: BASE_TICKS,
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
    platforms: [],
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
    const level = difficulty(r);
    if (level > 0 && (pattern === 3 || pattern === 5)) {
      // Reachable staircases: 1.1-unit rises and clear jump gaps.
      const count = level === 1 ? 3 : 4;
      for (let i = 0; i < count; i++) {
        const height = 1 + (i % 3) * 1.1;
        add(r, "platform", x + i * 5, height, level === 1 ? 3.6 : 3, 0.35);
        add(r, "feather", x + i * 5, height + 1.2, 0.45, 0.6);
      }
      add(r, "ink", x + 5, 0, count * 2, 0.28);
      const last = count - 1;
      add(r, "gift", x + last * 5, 1 + (last % 3) * 1.1 + 2.8, 1.3, 1);
      r.next += count * 5 + 14;
      continue;
    }
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
    if (level > 0 && (pattern === 0 || pattern === 1)) {
      // A low landing before the next box adds a timing decision.
      add(r, "platform", x + 12, 0.9 + level * 0.3, 2.8, 0.35);
      add(r, "ink", x + 12, 0, level === 2 ? 4 : 3, 0.28);
    }
    r.next += (level === 2 ? 14.5 : 16) + random(r) * 2;
  }
}
function feedback(r: Run, text: string, x = r.x, y = r.y + 1) {
  r.notice = text;
  r.noticeUntil = r.tick + 95;
  r.effects.push({ x, y, until: r.tick + 24 });
}
export function stepRun(r: Run, held: boolean): void {
  if (r.tick >= r.end) return;
  const previousChallenges = completedChallenges(r);
  const previousLevel = difficulty(r);
  r.tick++;
  const dt = 1 / FPS,
    speed = 5.1 + Math.min(r.tick / BASE_TICKS, 1) * 3;
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
        if (!r.platforms.includes(o.id)) r.platforms.push(o.id);
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
      r.end = Math.min(MAX_TICKS, r.end + 180);
      feedback(r, "Mais 3 segundos!");
    }
  }
  if (r.ground) r.combo = 0;
  r.things = r.things.filter((o) => o.x > r.x - 12);
  r.effects = r.effects.filter((p) => p.until > r.tick);
  generate(r);
  const earned = completedChallenges(r) - previousChallenges;
  if (earned > 0) {
    r.score += earned * 75;
    feedback(r, `Missão concluída! +${earned * 75} · Próximo desafio liberado`);
  } else if (difficulty(r) > previousLevel) {
    feedback(r, difficulty(r) === 1 ? "Nível 2 · Hora de subir nas plataformas!" : "Nível 3 · Reta final: ritmo acelerado!");
    r.noticeUntil = r.tick + 180;
  }
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

const LADDER = [
  {id: "penas", label: "Colete penas", targets: [10, 25, 50, 80], value: (r: Run) => r.feathers},
  {id: "saltos", label: "Pouse em plataformas", targets: [3, 8, 15, 22], value: (r: Run) => r.platforms.length},
  {id: "minhocas", label: "Pise em minhocas", targets: [2, 5, 9, 14], value: (r: Run) => r.worms},
  {id: "caixas", label: "Abra caixas", targets: [3, 7, 12, 18], value: (r: Run) => r.boxes},
];
export function challenges(r: Run) {
  return LADDER.map(m => {
    const value = m.value(r);
    const completed = m.targets.filter(t => value >= t).length;
    return {id: m.id, name: m.label, value, completed, total: m.targets.length,
      level: Math.min(completed + 1, m.targets.length),
      target: m.targets[Math.min(completed, m.targets.length - 1)]};
  });
}
function completedChallenges(r: Run) {
  return challenges(r).reduce((sum, m) => sum + m.completed, 0);
}
