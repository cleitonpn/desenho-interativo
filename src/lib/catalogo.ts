import type { Catalogo, Peca, SlotId } from './tipos'
import { listarPecasRemotas } from './pecasRemotas'

/** Ordem em que os slots aparecem no menu do editor. */
export const SLOTS: { id: SlotId; rotulo: string; emoji: string }[] = [
  { id: 'cabeca', rotulo: 'Cabeça', emoji: '🎩' },
  { id: 'olhos', rotulo: 'Óculos', emoji: '🕶️' },
  { id: 'pescoco', rotulo: 'Pescoço', emoji: '🎀' },
  { id: 'roupa_cima', rotulo: 'Cima', emoji: '🧥' },
  { id: 'roupa_baixo', rotulo: 'Baixo', emoji: '👗' },
  { id: 'bolsa', rotulo: 'Bolsas', emoji: '👜' },
  { id: 'meias', rotulo: 'Meias', emoji: '🧦' },
  { id: 'sapatos', rotulo: 'Sapatos', emoji: '👢' },
  { id: 'extras', rotulo: 'Extras', emoji: '✨' },
]

let cache: Catalogo | null = null

/**
 * O catálogo tem duas origens: o arquivo estático, com as peças que vieram do
 * PSD, e o Firestore, com as que o Vital subiu pelo painel. Uma peça do painel
 * com o mesmo id substitui a estática, o que permite corrigir uma sem deploy.
 */
export async function carregarCatalogo(): Promise<Catalogo> {
  if (cache) return cache
  const resp = await fetch(`${import.meta.env.BASE_URL}pecas/catalogo.json`)
  if (!resp.ok) throw new Error('Não consegui carregar o catálogo de peças.')
  const base = (await resp.json()) as Catalogo

  const remotas = await listarPecasRemotas()
  const porId = new Map(base.pecas.map((p) => [p.id, p]))
  for (const r of remotas) porId.set(r.id, r)

  cache = { ...base, pecas: [...porId.values()] }
  return cache
}

/** Força a próxima leitura a buscar de novo — usado após publicar uma peça. */
export function limparCacheDoCatalogo(): void {
  cache = null
}

export function caminhoDaPeca(peca: Peca): string {
  // Peças do painel já guardam a URL completa do Storage.
  if (peca.arquivo.startsWith('http')) return peca.arquivo
  return `${import.meta.env.BASE_URL}${peca.arquivo}`
}

export function pecasDoSlot(catalogo: Catalogo, slot: SlotId): Peca[] {
  return catalogo.pecas.filter((p) => p.slot === slot && !p.oculta)
}

export function acharPeca(catalogo: Catalogo, id: string): Peca | undefined {
  return catalogo.pecas.find((p) => p.id === id)
}

export function pecaBase(catalogo: Catalogo): Peca {
  const base = catalogo.pecas.find((p) => p.slot === 'base')
  if (!base) throw new Error('O catálogo não tem a peça base.')
  return base
}
