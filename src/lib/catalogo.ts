import type { Catalogo, Peca, Personagem, SlotId } from './tipos'
import { listarPecasRemotas, listarPersonagensRemotos } from './pecasRemotas'

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

  const [remotas, personagensNovos] = await Promise.all([
    listarPecasRemotas(), listarPersonagensRemotos(),
  ])

  // Personagens do painel se somam aos do arquivo; um com o mesmo id substitui.
  const porPersonagem = new Map<string, Personagem>()
  for (const p of base.personagens) porPersonagem.set(p.id, p)
  for (const p of personagensNovos) {
    const existente = porPersonagem.get(p.id)
    porPersonagem.set(p.id, { ...p, pecas: existente?.pecas ?? [] })
  }

  cache = {
    personagens: [...porPersonagem.values()].map((personagem) => {
      // As peças que o Vital sobe entram no personagem delas; uma com o mesmo
      // id substitui a do PSD, o que permite corrigir sem deploy.
      const porId = new Map(personagem.pecas.map((p) => [p.id, p]))
      for (const r of remotas) {
        if ((r.personagem ?? 'galinha') === personagem.id) porId.set(r.id, r)
      }
      const pecas = [...porId.values()]
      return { ...personagem, pecas, enquadramento: calcularEnquadramento(pecas, personagem) }
    }),
  }
  return cache
}

/**
 * O enquadramento sai das pecas que existem agora, e nao de um numero gravado.
 * Assim um acessorio novo que passe do contorno antigo — um chapeu mais alto,
 * uma capa mais larga — entra no quadro sozinho, sem cortar.
 */
function calcularEnquadramento(pecas: Peca[], personagem: Personagem) {
  const visiveis = pecas.filter((p) => !p.oculta)
  if (!visiveis.length) return personagem.enquadramento
  const x0 = Math.min(...visiveis.map((p) => p.x))
  const y0 = Math.min(...visiveis.map((p) => p.y))
  const x1 = Math.max(...visiveis.map((p) => p.x + p.w))
  const y1 = Math.max(...visiveis.map((p) => p.y + p.h))
  const folga = Math.round((x1 - x0) * 0.06)
  return { x: x0 - folga, y: y0 - folga, w: x1 - x0 + folga * 2, h: y1 - y0 + folga * 2 }
}

/** Força a próxima leitura a buscar de novo — usado após publicar uma peça. */
export function limparCacheDoCatalogo(): void {
  cache = null
}

/** O personagem padrão: o primeiro visível, na ordem definida pelo Vital. */
export function personagemPadrao(catalogo: Catalogo): Personagem {
  const visiveis = personagensVisiveis(catalogo)
  if (!visiveis.length) throw new Error('O catálogo não tem nenhum personagem.')
  return visiveis[0]
}

export function personagensVisiveis(catalogo: Catalogo): Personagem[] {
  return catalogo.personagens.filter((p) => !p.oculto).sort((a, b) => a.ordem - b.ordem)
}

export function acharPersonagem(catalogo: Catalogo, id: string | undefined): Personagem {
  return catalogo.personagens.find((p) => p.id === id) ?? personagemPadrao(catalogo)
}

export function caminhoDaPeca(peca: Peca): string {
  // Peças do painel já guardam a URL completa do Storage.
  if (peca.arquivo.startsWith('http')) return peca.arquivo
  return `${import.meta.env.BASE_URL}${peca.arquivo}`
}

export function pecasDoSlot(personagem: Personagem, slot: SlotId): Peca[] {
  return personagem.pecas.filter((p) => p.slot === slot && !p.oculta)
}

export function acharPeca(personagem: Personagem, id: string): Peca | undefined {
  return personagem.pecas.find((p) => p.id === id)
}

export function pecaBase(personagem: Personagem): Peca {
  const base = personagem.pecas.find((p) => p.slot === 'base')
  if (!base) throw new Error(`${personagem.nome} não tem peça base.`)
  return base
}

/** Slots que este personagem de fato tem, para o menu não mostrar vazio. */
export function slotsDisponiveis(personagem: Personagem) {
  return SLOTS.filter((s) => pecasDoSlot(personagem, s.id).length > 0)
}
