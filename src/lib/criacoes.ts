import {
  addDoc, collection, deleteDoc, doc, getDocs, limit, onSnapshot,
  orderBy, query, serverTimestamp, where,
} from 'firebase/firestore'
import { db } from './firebase'
import type { CorId } from '../config/marca'
import type { Criacao, Escolhas } from './tipos'

const col = collection(db, 'criacoes')

export async function salvarCriacao(
  uid: string, autorNome: string, escolhas: Escolhas, cor: CorId,
): Promise<string> {
  const ref = await addDoc(col, {
    uid, autorNome, escolhas, cor, publica: true, criadoEm: serverTimestamp(),
  })
  return ref.id
}

export async function apagarCriacao(id: string): Promise<void> {
  await deleteDoc(doc(db, 'criacoes', id))
}

export async function minhasCriacoes(uid: string): Promise<Criacao[]> {
  const snap = await getDocs(query(col, where('uid', '==', uid), orderBy('criadoEm', 'desc')))
  return snap.docs.map(paraCriacao)
}

/**
 * Vitrine da tela de abertura. Escuta em tempo real para que uma criação nova
 * apareça na hora para quem estiver com a página aberta.
 */
export function ouvirVitrine(quantas: number, aoMudar: (lista: Criacao[]) => void) {
  return onSnapshot(
    query(col, where('publica', '==', true), orderBy('criadoEm', 'desc'), limit(quantas)),
    (snap) => aoMudar(snap.docs.map(paraCriacao)),
    () => aoMudar([]),
  )
}

function paraCriacao(d: { id: string; data: () => Record<string, unknown> }): Criacao {
  const dados = d.data()
  const ts = dados.criadoEm as { toMillis?: () => number } | undefined
  return {
    id: d.id,
    uid: String(dados.uid ?? ''),
    autorNome: String(dados.autorNome ?? 'Alguém'),
    escolhas: (dados.escolhas ?? {}) as Escolhas,
    cor: (dados.cor ?? 'vermelho') as CorId,
    publica: Boolean(dados.publica),
    criadoEm: ts?.toMillis?.() ?? Date.now(),
  }
}
