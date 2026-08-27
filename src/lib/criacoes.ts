import {
  addDoc, collection, deleteDoc, doc, getDocs, limit, onSnapshot,
  orderBy, query, serverTimestamp, updateDoc, where,
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

/**
 * O nome do autor fica copiado dentro de cada criacao para a vitrine nao ter
 * de ler o perfil de todo mundo a cada carregamento. O preco disso e este:
 * quando a pessoa troca o nome, as copias precisam acompanhar.
 */
export async function renomearAutor(uid: string, autorNome: string): Promise<void> {
  const snap = await getDocs(query(col, where('uid', '==', uid)))
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { autorNome })))
}

export async function apagarCriacao(id: string): Promise<void> {
  await deleteDoc(doc(db, 'criacoes', id))
}

/**
 * Busca so por uid e ordena aqui, de proposito. Combinar where com orderBy
 * exigiria um indice composto no Firestore, e uma configuracao a mais e uma
 * configuracao a mais para dar errado. Ninguem tem criacoes suficientes para
 * que ordenar no cliente pese.
 */
export async function minhasCriacoes(uid: string): Promise<Criacao[]> {
  const snap = await getDocs(query(col, where('uid', '==', uid)))
  return snap.docs.map(paraCriacao).sort((a, b) => b.criadoEm - a.criadoEm)
}

/**
 * Vitrine da tela de abertura. Escuta em tempo real para que uma criação nova
 * apareça na hora para quem estiver com a página aberta.
 */
export function ouvirVitrine(quantas: number, aoMudar: (lista: Criacao[]) => void) {
  return onSnapshot(
    query(col, where('publica', '==', true), orderBy('criadoEm', 'desc'), limit(quantas)),
    (snap) => aoMudar(snap.docs.map(paraCriacao)),
    // A abertura tem os exemplos como rede de seguranca: se a consulta falhar,
    // a vitrine mostra eles em vez de um vazio.
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
