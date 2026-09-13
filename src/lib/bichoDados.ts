import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { BICHO_PADRAO, validarConfigBicho, type ConfigBicho } from "./bicho";
export async function carregarBicho(): Promise<ConfigBicho> {
  const snap = await getDoc(doc(db, "conteudo", "jogoBicho"));
  return snap.exists()
    ? validarConfigBicho(snap.data() as ConfigBicho)
    : structuredClone(BICHO_PADRAO);
}
export async function salvarBicho(config: ConfigBicho) {
  await setDoc(doc(db, "conteudo", "jogoBicho"), validarConfigBicho(config));
}
