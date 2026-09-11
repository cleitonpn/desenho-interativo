import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
export type GameEvent = {
  title: string;
  description: string;
  starts: number;
  ends: number;
  active: boolean;
  scenery: "auto" | "quintal" | "rua" | "atelie";
  pieces: string[];
};
export const DEFAULT_EVENT: GameEvent = {
  title: "",
  description: "",
  starts: 0,
  ends: 0,
  active: false,
  scenery: "auto",
  pieces: [],
};
export async function loadEvent(): Promise<GameEvent> {
  const s = await getDoc(doc(db, "conteudo", "eventoJogo"));
  return { ...DEFAULT_EVENT, ...s.data() } as GameEvent;
}
export function eventActive(e: GameEvent) {
  const now = Date.now();
  return e.active && e.starts <= now && (!e.ends || e.ends > now);
}
export async function saveEvent(e: GameEvent) {
  await setDoc(doc(db, "conteudo", "eventoJogo"), e);
}
