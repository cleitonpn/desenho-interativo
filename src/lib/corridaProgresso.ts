import { missions, type Run } from "./corrida";
export type History = {
  date: number;
  score: number;
  feathers: number;
  worms: number;
  boxes: number;
};
export type Journal = {
  best: number;
  runs: History[];
  collection: string[];
  achievements: string[];
  days: string[];
  weekly?: { key: string; boxes: number };
  daily?: string[];
};
const KEY = "quintal:corrida:v1";
export function journal(): Journal {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      p &&
      Array.isArray(p.runs) &&
      Array.isArray(p.collection) &&
      Array.isArray(p.achievements) &&
      Array.isArray(p.days) &&
      Number.isFinite(p.best)
    )
      return p;
  } catch {
    /* Private browsing */
  }
  return { best: 0, runs: [], collection: [], achievements: [], days: [] };
}
export function dayKey() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}
export function weekKey() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function dailySeed() {
  return Number(dayKey().replaceAll("-", ""));
}
export const ACHIEVEMENTS: Record<string, string> = {
  first: "Primeira chegada",
  feathers: "Colecionador de penas",
  combo: "Pulo de mestre",
  clean: "Sem uma gota",
  wardrobe: "Guarda-roupa criativo",
  week: "Frequentador do quintal",
  weekly: "Semana de descobertas",
  daily: "Desafio do dia",
};
export function saveJournal(r: Run, items: string[], dailyMode = false) {
  const p = journal(),
    ach = [...p.achievements];
  function add(id: string, yes: boolean) {
    if (yes && !ach.includes(id)) ach.push(id);
  }
  add("first", true);
  add("feathers", r.feathers >= 20);
  add("combo", r.bestCombo >= 2);
  add("clean", r.hits === 0);
  const collection = [...new Set([...p.collection, ...items])],
    days = [...new Set([...p.days, dayKey()])].slice(-90);
  add("wardrobe", collection.length >= 10);
  add("week", days.length >= 7);
  const weekly = {
    key: weekKey(),
    boxes:
      (p.weekly?.key === weekKey()
        ? p.weekly.boxes
        : p.runs
            .filter(
              (h) => h.date >= new Date(weekKey() + "T00:00:00Z").getTime(),
            )
            .reduce((sum, h) => sum + h.boxes, 0)) + r.boxes,
  };
  const daily = [
    ...new Set([
      ...(p.daily ?? []),
      ...(dailyMode &&
      missions(r)[dailySeed() % 4].value >= missions(r)[dailySeed() % 4].target
        ? [dayKey()]
        : []),
    ]),
  ].slice(-90);
  add("weekly", weekly.boxes >= 30);
  add("daily", daily.includes(dayKey()));
  const result: Journal = {
    best: Math.max(p.best, r.score),
    collection,
    achievements: ach,
    days,
    weekly,
    daily,
    runs: [
      {
        date: Date.now(),
        score: r.score,
        feathers: r.feathers,
        worms: r.worms,
        boxes: r.boxes,
      },
      ...p.runs,
    ].slice(0, 30),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(result));
  } catch {
    /* Run remains playable. */
  }
  return {
    journal: result,
    newAchievements: ach.filter((a) => !p.achievements.includes(a)),
    missions: missions(r),
  };
}
