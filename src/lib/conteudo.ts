import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebase'

/**
 * Conteudo do estudio que o Vital edita sozinho: a bio dele e as fotos dos
 * trabalhos. Fica no Firestore, e nao no codigo, porque trocar uma foto nao
 * pode depender de deploy.
 */

export interface Sobre {
  bio: string
  fotos: string[]
  atualizadoEm: number
}

export const SOBRE_VAZIO: Sobre = { bio: '', fotos: [], atualizadoEm: 0 }

export async function carregarSobre(): Promise<Sobre> {
  try {
    const snap = await getDoc(doc(db, 'conteudo', 'sobre'))
    return snap.exists() ? { ...SOBRE_VAZIO, ...(snap.data() as Sobre) } : SOBRE_VAZIO
  } catch {
    return SOBRE_VAZIO
  }
}

export async function salvarSobre(sobre: Partial<Sobre>): Promise<void> {
  await setDoc(doc(db, 'conteudo', 'sobre'), { ...sobre, atualizadoEm: Date.now() }, { merge: true })
}

export interface Tattoo {
  id: string
  arquivo: string
  caminhoStorage: string
  legenda: string
  criadoEm: number
}

export async function listarTattoos(): Promise<Tattoo[]> {
  try {
    const snap = await getDocs(query(collection(db, 'tattoos'), orderBy('criadoEm', 'desc')))
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Tattoo, 'id'>) }))
  } catch {
    return []
  }
}

export async function publicarTattoo(arquivo: File, legenda: string): Promise<Tattoo> {
  const chave = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const caminhoStorage = `tattoos/${chave}`
  const destino = ref(storage, caminhoStorage)
  await uploadBytes(destino, arquivo, { contentType: arquivo.type })
  const url = await getDownloadURL(destino)
  const tattoo: Omit<Tattoo, 'id'> = {
    arquivo: url, caminhoStorage, legenda, criadoEm: Date.now(),
  }
  const criado = await addDoc(collection(db, 'tattoos'), tattoo)
  return { id: criado.id, ...tattoo }
}

export async function removerTattoo(t: Tattoo): Promise<void> {
  await deleteDoc(doc(db, 'tattoos', t.id))
  try {
    await deleteObject(ref(storage, t.caminhoStorage))
  } catch {
    // O registro já saiu; arquivo órfão no Storage não quebra nada.
  }
}

/** Sobe uma foto avulsa (as do "quem sou eu") e devolve a URL. */
export async function subirFoto(arquivo: File, pasta: string): Promise<string> {
  const chave = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const destino = ref(storage, `${pasta}/${chave}`)
  await uploadBytes(destino, arquivo, { contentType: arquivo.type })
  return getDownloadURL(destino)
}
