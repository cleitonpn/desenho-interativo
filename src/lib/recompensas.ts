import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { app, db } from "./firebase";
import { MARCA } from "../config/marca";
import type { Input } from "./corrida";

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: "percent" | "fixed" | "gift" | "benefit";
  value: number;
  terms: string;
  image: string;
  active: boolean;
  starts: number;
  ends: number;
  validityDays: number;
  stock: number;
  issued: number;
  used: number;
  chance: number;
  perUser: number;
  cooldownDays: number;
  minBoxes: number;
  mission: "" | "penas" | "minhocas" | "caixas" | "limpa";
}
export interface Coupon {
  code: string;
  uid: string;
  name: string;
  description?: string;
  image?: string;
  terms: string;
  type: Reward["type"];
  value: number;
  expires: number;
  created: number;
  usedAt: number | null;
  rewardId: string;
}
export interface Session {
  id: string;
  seed: number;
  version: number;
}
const functions = getFunctions(app, "southamerica-east1");
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === "1")
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
export async function call<T>(name: string, data: unknown): Promise<T> {
  return (
    await httpsCallable<unknown, T>(functions, name, { timeout: 20000 })(data)
  ).data;
}
export const beginRun = () => call<Session>("beginRun", {});
export const finishRun = (id: string, inputs: Input[]) =>
  call<{ coupons: Coupon[]; score: number }>("finishRun", { id, inputs });
export async function myCoupons(uid: string) {
  const s = await getDocs(
    query(collection(db, "gameCoupons"), where("uid", "==", uid)),
  );
  return s.docs
    .map((d) => d.data() as Coupon)
    .sort((a, b) => b.created - a.created);
}
export async function rewards() {
  const s = await getDocs(collection(db, "gameRewards"));
  return s.docs.map((d) => ({ ...d.data(), id: d.id }) as Reward);
}
export async function leaderboard(week: string) {
  const s = await getDocs(
    query(
      collection(db, `gameWeeks/${week}/scores`),
      orderBy("score", "desc"),
      limit(10),
    ),
  );
  return s.docs.map((d) => d.data() as { alias: string; score: number });
}
export function couponLink(c: Coupon) {
  return `https://wa.me/${MARCA.whatsapp}?text=${encodeURIComponent(`Oi, Vital! Ganhei ${c.name} no ${MARCA.nomeCompleto}.\nMeu cupom: ${c.code}\nVálido até ${new Date(c.expires).toLocaleDateString("pt-BR")}.\n${c.terms}\nQuero conversar sobre minha próxima arte!`)}`;
}
export const EMPTY_REWARD: Reward = {
  id: "",
  name: "",
  description: "",
  type: "percent",
  value: 5,
  terms: "Não cumulativo. Agendamento sujeito à disponibilidade.",
  image: "",
  active: false,
  starts: 0,
  ends: 0,
  validityDays: 30,
  stock: 50,
  issued: 0,
  used: 0,
  chance: 10,
  perUser: 1,
  cooldownDays: 30,
  minBoxes: 1,
  mission: "",
};
