import {
  addDoc, collection, deleteDoc, doc, getDocs, limit, onSnapshot,
  orderBy, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore'
import { deleteUser } from 'firebase/auth'
import { auth } from './firebase'
import { db } from './firebase'
import type { CorId } from '../config/marca'
import type { Criacao, Escolhas } from './tipos'

const col = collection(db, 'criacoes')

/** A vitrine é pública, então guarda só o primeiro nome — sobrenome ali é
 *  mais exposição do que a pessoa precisa dar para aparecer numa parede. */
/**
 * Apaga a conta e tudo que a pessoa deixou aqui. A ordem importa: as criacoes e
 * o perfil saem enquanto ainda ha login, porque as regras exigem estar
 * autenticado para apagar os proprios dados. A conta em si vai por ultimo.
 *
 * O que fica sao os contadores de uso, que nao guardam quem fez o que — sao
 * numeros somados de todo mundo, sem volta para uma pessoa.
 */
export async function apagarTudoDoUsuario(uid: string): Promise<void> {
  const minhas = await getDocs(query(col, where('uid', '==', uid)))
  await Promise.all(minhas.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'usuarios', uid))
  if (auth.currentUser) await deleteUser(auth.currentUser)
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || 'Alguém'
}

export async function salvarCriacao(
  uid: string, autorNome: string, escolhas: Escolhas, cor: CorId,
): Promise<string> {
  const ref = await addDoc(col, {
    uid, autorNome: primeiroNome(autorNome), escolhas, cor,
    publica: true, criadoEm: serverTimestamp(),
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
  const curto = primeiroNome(autorNome)
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { autorNome: curto })))
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
