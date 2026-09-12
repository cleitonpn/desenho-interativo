import { MAX_TICKS } from "./engine.mjs";
export function validateInputs(inputs) {
  if (!Array.isArray(inputs) || inputs.length > 3600)
    throw Error("Comandos inválidos.");
  let last = -1,
    held = false;
  for (const input of inputs) {
    if (
      !input ||
      !Number.isInteger(input.tick) ||
      input.tick <= last ||
      input.tick < 0 ||
      input.tick >= MAX_TICKS ||
      typeof input.held !== "boolean" ||
      input.held === held
    )
      throw Error("Comandos inválidos.");
    last = input.tick;
    held = input.held;
  }
  return inputs;
}
export function validateReward(r) {
  if (!r || typeof r !== "object") throw Error("Recompensa inválida.");
  const out = {};
  for (const [key, max] of [
    ["name", 100],
    ["description", 400],
    ["terms", 1000],
    ["image", 1500],
  ]) {
    if (typeof r[key] !== "string" || r[key].length > max)
      throw Error(`Campo ${key} inválido.`);
    out[key] = r[key].trim();
  }
  if (!out.name || !out.terms) throw Error("Preencha nome e condições.");
  if (out.image && !/^https:\/\//.test(out.image))
    throw Error("A imagem precisa de uma URL HTTPS.");
  if (!["percent", "fixed", "gift", "benefit"].includes(r.type))
    throw Error("Tipo inválido.");
  out.type = r.type;
  for (const [key, min, max] of [
    ["value", 0, 100000],
    ["starts", 0, 9999999999999],
    ["ends", 0, 9999999999999],
    ["validityDays", 1, 365],
    ["stock", 0, 100000],
    ["chance", 0, 100],
    ["perUser", 1, 100],
    ["cooldownDays", 0, 365],
    ["minBoxes", 1, 100],
  ]) {
    if (!Number.isFinite(r[key]) || r[key] < min || r[key] > max)
      throw Error(`Campo ${key} inválido.`);
    if (!["value", "chance"].includes(key) && !Number.isInteger(r[key]))
      throw Error(`Campo ${key} deve ser inteiro.`);
    out[key] = r[key];
  }
  if (
    (r.type === "percent" && (r.value <= 0 || r.value > 100)) ||
    (r.type === "fixed" && r.value <= 0)
  )
    throw Error("Valor do desconto inválido.");
  if (r.ends && r.ends <= r.starts)
    throw Error("O término deve ser posterior ao início.");
  if (
    typeof r.active !== "boolean" ||
    !["", "penas", "minhocas", "caixas", "limpa"].includes(r.mission)
  )
    throw Error("Configuração inválida.");
  out.active = r.active;
  out.mission = r.mission;
  return out;
}
export function eligible(r, usage, run, now, completed) {
  return (
    r.active &&
    r.starts <= now &&
    (!r.ends || r.ends > now) &&
    r.issued < r.stock &&
    run.boxes >= r.minBoxes &&
    (!r.mission || completed.includes(r.mission)) &&
    (usage?.count ?? 0) < r.perUser &&
    (!usage?.last || now - usage.last >= r.cooldownDays * 86400000)
  );
}
export function weekKey(now = Date.now()) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
