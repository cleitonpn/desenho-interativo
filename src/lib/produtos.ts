import {
  addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, setDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Frete, Produto } from './loja'

/**
 * Produtos e fretes, geridos pelo Vital. Categoria e texto livre de proposito:
 * ele cria "Ceramica" ou "Bones" sozinho, sem depender de eu abrir o codigo
 * para acrescentar uma opcao numa lista.
 */

export async function listarProdutos(): Promise<Produto[]> {
  try {
    const snap = await getDocs(query(collection(db, 'produtos'), orderBy('criadoEm', 'desc')))
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Produto, 'id'>) }))
  } catch {
    return []
  }
}

export async function salvarProduto(produto: Omit<Produto, 'id'> & { id?: string }): Promise<string> {
  if (produto.id) {
    const { id, ...dados } = produto
    await setDoc(doc(db, 'produtos', id), dados, { merge: true })
    return id
  }
  const criado = await addDoc(collection(db, 'produtos'), produto)
  return criado.id
}

export async function apagarProduto(id: string): Promise<void> {
  await deleteDoc(doc(db, 'produtos', id))
}

export async function listarFretes(): Promise<Frete[]> {
  try {
    const snap = await getDocs(collection(db, 'fretes'))
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Frete, 'id'>) }))
  } catch {
    return []
  }
}

export async function salvarFrete(frete: Omit<Frete, 'id'> & { id?: string }): Promise<void> {
  if (frete.id) {
    const { id, ...dados } = frete
    await setDoc(doc(db, 'fretes', id), dados, { merge: true })
    return
  }
  await addDoc(collection(db, 'fretes'), frete)
}

export async function apagarFrete(id: string): Promise<void> {
  await deleteDoc(doc(db, 'fretes', id))
}

/** As categorias vêm do que já foi cadastrado, mais as sugestões de partida. */
export function categoriasEmUso(produtos: Produto[], sugeridas: readonly string[]): string[] {
  return [...new Set([...produtos.map((p) => p.categoria), ...sugeridas])]
    .filter(Boolean).sort()
}
