import type { CorId } from '../config/marca'

/** Um slot e uma vaga do corpo: cabe no maximo uma peca por vez. */
export type SlotId =
  | 'meias' | 'sapatos' | 'roupa_baixo' | 'roupa_cima'
  | 'pescoco' | 'bolsa' | 'cabeca' | 'olhos' | 'extras'

export interface Peca {
  id: string
  slot: SlotId | 'base'
  arquivo: string
  /** Posicao e tamanho dentro do canvas original de 2480x3508. */
  x: number
  y: number
  w: number
  h: number
  /** Nome do arquivo exportado do Procreate, para rastrear a origem. */
  origem: string
  /** Rotulo mostrado ao cliente. Derivado do id, editavel pelo admin. */
  rotulo?: string
  /** Peca escondida do cliente sem ser apagada. */
  oculta?: boolean
}

export interface Catalogo {
  canvas: { w: number; h: number }
  /**
   * Recorte fixo que cobre todas as pecas do catalogo. E o enquadramento
   * padrao do editor: mantem a galinha grande sem que ela mude de tamanho a
   * cada acessorio trocado, o que aconteceria com um recorte dinamico.
   */
  enquadramento: { x: number; y: number; w: number; h: number }
  ordemCamadas: (SlotId | 'base')[]
  pecas: Peca[]
}

/** O que o cliente escolheu: no maximo um id de peca por slot. */
export type Escolhas = Partial<Record<SlotId, string>>

export interface Criacao {
  id: string
  uid: string
  autorNome: string
  escolhas: Escolhas
  cor: CorId
  criadoEm: number
  /** Aparece na vitrine da tela de abertura. */
  publica: boolean
}

export interface Perfil {
  uid: string
  nome: string
  email: string
  whatsapp: string
  cidade: string
  nascimento: string
  jaFezArte: boolean
  criadoEm: number
  admin?: boolean
}
