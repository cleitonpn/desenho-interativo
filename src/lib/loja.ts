import type { CorId } from '../config/marca'
import type { Escolhas } from './tipos'

/**
 * Medidas em MILIMETROS, sempre. O mockup, o preco e o arquivo que vai para a
 * estampa leem os mesmos numeros — assim o que o cliente ve na tela e do
 * tamanho que sai impresso, em vez de "mais ou menos ali".
 */
export const CAMISETA_MM = { largura: 700, altura: 780 } as const

/** Onde a arte pode ser aplicada, com o tamanho combinado com o Vital. */
export const AREAS = {
  costas: {
    id: 'costas', rotulo: 'Costas', face: 'costas',
    // A3 inteiro: 297 x 420 mm, centralizado, começando abaixo da gola.
    x: (CAMISETA_MM.largura - 297) / 2, y: 155, largura: 297, altura: 420,
    descricao: 'A3 (29,7 × 42 cm)',
  },
  peito: {
    id: 'peito', rotulo: 'Peito', face: 'frente',
    // 10 cm no peito ESQUERDO de quem veste — que aparece à direita para quem
    // olha a camiseta de frente.
    x: 385, y: 185, largura: 100, altura: 140,
    descricao: '10 cm, peito esquerdo',
  },
} as const

export type AreaId = keyof typeof AREAS

export type CorCamiseta = 'branca' | 'preta'

export const CORES_CAMISETA: Record<CorCamiseta, { rotulo: string; tecido: string; costura: string }> = {
  branca: { rotulo: 'Branca', tecido: '#FAFAF8', costura: '#E2DED9' },
  preta: { rotulo: 'Preta', tecido: '#1A1A1A', costura: '#333333' },
}

export const TAMANHOS = ['P', 'M', 'G', 'GG', 'XG'] as const
export type Tamanho = (typeof TAMANHOS)[number]

/**
 * A loja nao vende so camiseta: entram as ceramicas do Vital e a customizacao
 * de roupa que a pessoa ja tem. Os tres compram de jeitos diferentes, e o tipo
 * e o que decide o fluxo da tela.
 */
export type TipoProduto =
  /** Arte aplicada sobre o produto, com mockup: camiseta, moletom, bone. */
  | 'personalizavel'
  /** Peca acabada, vendida pela foto: ceramica, print, adesivo. */
  | 'pronto'
  /** A pessoa manda a peca dela e combina o trabalho: customizacao. */
  | 'servico'
  /** Desenho reservado para tatuar. Nao e produto: e uma sessao marcada. */
  | 'flash'

export interface Produto {
  id: string
  nome: string
  descricao: string
  tipo: TipoProduto
  /** Agrupa a vitrine. Texto livre para o Vital criar categoria nova sozinho. */
  categoria: string
  precoCentavos: number
  /** Fotos do produto. Obrigatorias em 'pronto' e 'servico'. */
  fotos: string[]
  /** Só em 'personalizavel'. */
  cores?: CorCamiseta[]
  tamanhos?: Tamanho[]
  areas?: AreaId[]
  /**
   * Só em 'pronto'. Ceramica costuma ser peca unica: 1 aqui tira o produto do
   * ar assim que vender. null = faz sob demanda, sem limite.
   */
  estoque?: number | null
  /** Em 'servico', o preco e ponto de partida e o valor final vem do orcamento. */
  precoSobConsulta?: boolean
  /** Só em 'flash': tamanho aproximado e onde do corpo o Vital sugere. */
  tamanhoCm?: number
  localSugerido?: string
  ativo: boolean
  criadoEm: number
}

export const CATEGORIAS_SUGERIDAS = [
  'Camisetas', 'Cerâmicas', 'Flash', 'Customização', 'Prints', 'Acessórios',
] as const

export const TIPOS_ROTULO: Record<TipoProduto, { rotulo: string; ajuda: string }> = {
  personalizavel: {
    rotulo: 'Com arte aplicada',
    ajuda: 'A pessoa escolhe a arte e vê o mockup antes de comprar.',
  },
  pronto: {
    rotulo: 'Peça pronta',
    ajuda: 'Vendida pela foto, do jeito que está. Dá para marcar peça única.',
  },
  servico: {
    rotulo: 'Serviço',
    ajuda: 'A pessoa manda a peça dela e vocês combinam. Fecha por orçamento.',
  },
  flash: {
    rotulo: 'Flash de tatuagem',
    ajuda: 'Desenho reservado para tatuar. Some do catálogo quando alguém fecha.',
  },
}

/**
 * Flash e customizacao acontecem no estudio, com a pessoa presente — cobrar
 * frete deles seria cobrar entrega de algo que nao e entregue. O checkout usa
 * isto para so pedir endereco quando ha o que enviar.
 */
export function precisaEntrega(tipo: TipoProduto): boolean {
  return tipo === 'personalizavel' || tipo === 'pronto'
}

/** Artes prontas do Vital, para quem não quer montar a própria galinha. */
export interface ArtePronta {
  id: string
  nome: string
  arquivo: string
  caminhoStorage: string
  ativo: boolean
  criadoEm: number
}

/** A arte aplicada numa camiseta: ou a galinha montada, ou uma arte do Vital. */
export type Arte =
  | { tipo: 'galinha'; escolhas: Escolhas; cor: CorId }
  | { tipo: 'pronta'; arteId: string; arquivo: string; nome: string }

export interface Frete {
  id: string
  regiao: string
  precoCentavos: number
  prazo: string
}

export interface ItemCarrinho {
  id: string
  produtoId: string
  produtoNome: string
  precoCentavos: number
  quantidade: number
  /** Só em produto personalizável. */
  cor?: CorCamiseta
  tamanho?: Tamanho
  area?: AreaId
  arte?: Arte
  /** Em serviço ou flash, o que a pessoa quer combinar. */
  observacao?: string
}

export function formatarPreco(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
