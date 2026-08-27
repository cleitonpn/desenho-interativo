import type { Catalogo, Peca, SlotId } from './tipos'

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

export async function carregarCatalogo(): Promise<Catalogo> {
  if (cache) return cache
  const resp = await fetch(`${import.meta.env.BASE_URL}pecas/catalogo.json`)
  if (!resp.ok) throw new Error('Não consegui carregar o catálogo de peças.')
  cache = (await resp.json()) as Catalogo
  return cache
}

export function caminhoDaPeca(peca: Peca): string {
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
