import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import { SLOTS } from './catalogo'
import type { Catalogo, Peca, SlotId } from './tipos'

export interface MetricaPeca {
  peca: string
  slot: SlotId
  escolhas: number
  salvamentos: number
  levadas: number
  descartes: number
}

export interface Comportamento {
  sessoes: number
  segundosTotais: number
  /** Mediana, não média: uma sessão esquecida aberta distorce a média. */
  medianaSegundos: number
  sorteios: number
  escolhasManuais: number
  salvamentos: number
  /** Download + compartilhamento + WhatsApp: o mais perto de "quis levar". */
  levadas: number
  provasPele: number
  trocasCor: number
  limpezas: number
}

export interface PecaComTaxas extends MetricaPeca {
  rotulo: string
  /** Das vezes que foi vestida, quantas sobreviveram até salvar. */
  retencao: number
  /** Das vezes que foi vestida, quantas foram tiradas antes do fim. */
  descarte: number
}

export interface ResumoSlot {
  slot: SlotId
  rotulo: string
  emoji: string
  pecas: number
  escolhas: number
  /** Escolhas por peça: mede apetite pela categoria, não o tamanho dela. */
  apetite: number
}

export interface Dica {
  titulo: string
  texto: string
  /** 'fazer' sugere desenho novo; 'rever' aponta o que não está saindo. */
  tipo: 'fazer' | 'rever' | 'observar'
}

export interface Analise {
  comportamento: Comportamento
  pecas: PecaComTaxas[]
  slots: ResumoSlot[]
  ignoradas: PecaComTaxas[]
  dicas: Dica[]
  /** O quanto dá para confiar no que está na tela, dado o volume. */
  confianca: Confianca
}

/**
 * As dicas aparecem cedo, para dar o que olhar enquanto a ferramenta e
 * mostrada para as primeiras pessoas — mas o painel diz em que pe esta, para
 * que uma coincidencia de quatro visitas nao vire decisao de desenho.
 */
export type Confianca = 'insuficiente' | 'testando' | 'preliminar' | 'firme'

const MINIMO_SESSOES = 4
const MINIMO_ESCOLHAS_PECA = 3

export function medirConfianca(sessoes: number): Confianca {
  if (sessoes < MINIMO_SESSOES) return 'insuficiente'
  if (sessoes < 15) return 'testando'
  if (sessoes < 40) return 'preliminar'
  return 'firme'
}

export async function carregarAnalise(catalogo: Catalogo): Promise<Analise> {
  const [metricasSnap, sessoesSnap] = await Promise.all([
    getDocs(collection(db, 'metricas')),
    getDocs(collection(db, 'sessoes')),
  ])

  const porPeca = new Map<string, MetricaPeca>()
  for (const d of metricasSnap.docs) {
    const m = d.data() as MetricaPeca
    if (m.peca) porPeca.set(m.peca, m)
  }

  const duracoes: number[] = []
  const c: Comportamento = {
    sessoes: sessoesSnap.size, segundosTotais: 0, medianaSegundos: 0,
    sorteios: 0, escolhasManuais: 0, salvamentos: 0, levadas: 0,
    provasPele: 0, trocasCor: 0, limpezas: 0,
  }
  for (const d of sessoesSnap.docs) {
    const s = d.data() as Record<string, number>
    const seg = s.segundos ?? 0
    duracoes.push(seg)
    c.segundosTotais += seg
    c.sorteios += s.sorteio ?? 0
    c.escolhasManuais += s.escolha_manual ?? 0
    c.salvamentos += s.salvamento ?? 0
    c.levadas += (s.download ?? 0) + (s.compartilhamento ?? 0) + (s.whatsapp ?? 0)
    c.provasPele += s.prova_pele ?? 0
    c.trocasCor += s.troca_cor ?? 0
    c.limpezas += s.limpeza ?? 0
  }
  duracoes.sort((a, b) => a - b)
  c.medianaSegundos = duracoes.length ? duracoes[Math.floor(duracoes.length / 2)] : 0

  // Toda peça do catálogo entra, inclusive com zero — as que ninguém usa são
  // metade da informação.
  const visiveis: Peca[] = catalogo.personagens
    .filter((pers) => !pers.oculto)
    .flatMap((pers) => pers.pecas.filter((p) => p.slot !== 'base' && !p.oculta))
  const pecas: PecaComTaxas[] = visiveis.map((p) => {
    const m = porPeca.get(p.id) ?? {
      peca: p.id, slot: p.slot as SlotId, escolhas: 0, salvamentos: 0, levadas: 0, descartes: 0,
    }
    return {
      ...m,
      rotulo: p.rotulo ?? p.id,
      retencao: m.escolhas ? m.salvamentos / m.escolhas : 0,
      descarte: m.escolhas ? m.descartes / m.escolhas : 0,
    }
  }).sort((a, b) => b.escolhas - a.escolhas)

  const slots: ResumoSlot[] = SLOTS.map((s) => {
    const doSlot = pecas.filter((p) => p.slot === s.id)
    const escolhas = doSlot.reduce((t, p) => t + p.escolhas, 0)
    return {
      slot: s.id, rotulo: s.rotulo, emoji: s.emoji,
      pecas: doSlot.length, escolhas,
      apetite: doSlot.length ? escolhas / doSlot.length : 0,
    }
  }).sort((a, b) => b.apetite - a.apetite)

  const confianca = medirConfianca(c.sessoes)
  return {
    comportamento: c,
    pecas,
    slots,
    ignoradas: pecas.filter((p) => p.escolhas === 0),
    dicas: confianca === 'insuficiente' ? [] : gerarDicas(pecas, slots, c, visiveis),
    confianca,
  }
}

/**
 * As dicas saem de regras sobre os números, não de opinião. Cada uma só aparece
 * quando o dado que a sustenta existe — sugerir "faça mais chapéus" com quatro
 * cliques de amostra seria pior que não sugerir nada.
 */
function gerarDicas(
  pecas: PecaComTaxas[], slots: ResumoSlot[], c: Comportamento, visiveis: Peca[],
): Dica[] {
  const dicas: Dica[] = []
  const comDados = pecas.filter((p) => p.escolhas >= MINIMO_ESCOLHAS_PECA)

  // 1. Categoria com muita procura para o tamanho que tem.
  const apetiteMedio = slots.reduce((t, s) => t + s.apetite, 0) / (slots.length || 1)
  for (const s of slots.slice(0, 2)) {
    if (s.apetite > apetiteMedio * 1.4 && s.escolhas >= 6) {
      dicas.push({
        tipo: 'fazer',
        titulo: `Mais ${s.rotulo.toLowerCase()}`,
        texto: `${s.rotulo} tem ${Math.round(s.apetite)} escolhas por peça, bem acima da `
          + `média (${Math.round(apetiteMedio)}). São só ${s.pecas} opções para tanta procura — `
          + 'é onde um desenho novo rende mais.',
      })
    }
  }

  // 2. Peça que domina a própria categoria: o estilo dela agrada, não só ela.
  for (const s of slots) {
    const doSlot = comDados.filter((p) => p.slot === s.slot)
    if (doSlot.length < 3) continue
    const [primeira, segunda] = doSlot
    if (primeira && segunda && primeira.escolhas > segunda.escolhas * 2) {
      dicas.push({
        tipo: 'fazer',
        titulo: `Variações de "${primeira.rotulo}"`,
        texto: `Essa peça sozinha tem mais que o dobro da segunda colocada em `
          + `${s.rotulo.toLowerCase()} (${primeira.escolhas} contra ${segunda.escolhas}). `
          + 'O estilo dela é o que agrada — variações devem funcionar.',
      })
    }
  }

  // 3. Atrai mas não fecha: a pessoa veste e tira.
  const descartadas = comDados
    .filter((p) => p.descarte > 0.6).sort((a, b) => b.descarte - a.descarte).slice(0, 2)
  for (const p of descartadas) {
    dicas.push({
      tipo: 'observar',
      titulo: `"${p.rotulo}" atrai mas não fica`,
      texto: `${Math.round(p.descarte * 100)}% de quem experimenta acaba tirando. `
        + 'A ideia chama atenção; talvez o desenho precise de uma versão mais suave ou mais forte.',
    })
  }

  // 4. O que ninguém escolhe.
  const ignoradas = pecas.filter((p) => p.escolhas === 0)
  if (ignoradas.length >= 3 && c.sessoes >= 8) {
    dicas.push({
      tipo: 'rever',
      titulo: `${ignoradas.length} peças sem nenhuma escolha`,
      texto: `Depois de ${c.sessoes} visitas, ninguém vestiu: `
        + ignoradas.slice(0, 5).map((p) => `"${p.rotulo}"`).join(', ')
        + (ignoradas.length > 5 ? ' e outras.' : '.')
        + ' Vale conferir se estão na categoria certa antes de concluir que não agradam.',
    })
  }

  // 5. Como a galera navega: sorteio é exploração, escolha é intenção.
  const totalAcoes = c.sorteios + c.escolhasManuais
  if (totalAcoes >= 12) {
    const fracaoSorteio = c.sorteios / totalAcoes
    if (fracaoSorteio > 0.6) {
      dicas.push({
        tipo: 'observar',
        titulo: 'A galera explora pelo sorteio',
        texto: `${Math.round(fracaoSorteio * 100)}% das combinações vêm do botão de sortear. `
          + 'As pessoas descobrem as peças por acaso, não procurando — o que sai no sorteio '
          + 'é o que elas conhecem do seu trabalho.',
      })
    } else if (fracaoSorteio < 0.2) {
      dicas.push({
        tipo: 'observar',
        titulo: 'A galera monta na mão',
        texto: `Só ${Math.round(fracaoSorteio * 100)}% usam o sorteio. As pessoas chegam com `
          + 'ideia formada e procuram peça por peça — nomes claros importam mais que quantidade.',
      })
    }
  }

  // 6. Muita montagem e pouca entrega: o desenho não está virando conversa.
  if (c.salvamentos >= 6 && c.levadas / c.salvamentos < 0.25) {
    dicas.push({
      tipo: 'observar',
      titulo: 'Salvam, mas não te mandam',
      texto: `De ${c.salvamentos} galinhas salvas, só ${c.levadas} viraram download, `
        + 'compartilhamento ou WhatsApp. O botão de mandar pode estar passando batido.',
    })
  }

  // 7. Categoria grande que ninguém abre.
  const encolhendo = slots.filter((s) => s.pecas >= 8 && s.apetite < apetiteMedio * 0.4)
  for (const s of encolhendo.slice(0, 1)) {
    dicas.push({
      tipo: 'rever',
      titulo: `${s.rotulo} tem mais peça que procura`,
      texto: `${s.pecas} opções para ${Math.round(s.apetite)} escolhas por peça. `
        + 'Não falta variedade aqui — o esforço rende mais em outra categoria.',
    })
  }

  void visiveis
  return dicas
}

export function formatarDuracao(segundos: number): string {
  if (segundos < 60) return `${Math.round(segundos)}s`
  const min = Math.floor(segundos / 60)
  const seg = Math.round(segundos % 60)
  return seg ? `${min}min ${seg}s` : `${min}min`
}
