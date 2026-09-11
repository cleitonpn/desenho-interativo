import type { CorId } from '../config/marca'

/** Um slot e uma vaga do corpo: cabe no maximo uma peca por vez. */
export type SlotId =
  | 'meias' | 'sapatos' | 'roupa_baixo' | 'roupa_cima'
  | 'pescoco' | 'bolsa' | 'cabeca' | 'olhos' | 'extras'

export interface Peca {
  id: string
  /** A quem esta peça pertence. Um chapéu de galinha não serve num gato. */
  personagem: string
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

/**
 * Um personagem e um desenho-base com o proprio acervo de acessorios. O Vital
 * comecou pela galinha e ja esta desenhando outros bichos, entao o catalogo
 * nasce plural: cada personagem tem seu canvas, sua ordem de camadas e suas
 * pecas, porque as medidas do PSD de um nao valem para o outro.
 */
export interface Personagem {
  id: string
  nome: string
  /** Posição na lista de escolha. */
  ordem: number
  canvas: { w: number; h: number }
  /**
   * Recorte fixo que cobre todas as peças deste personagem. É o enquadramento
   * do editor: mantém o desenho grande sem que ele mude de tamanho a cada
   * acessório trocado.
   */
  enquadramento: { x: number; y: number; w: number; h: number }
  ordemCamadas: (SlotId | 'base')[]
  /**
   * Onde estao as patas dentro do desenho, em fracao do enquadramento. Serve
   * ao jogo, que recorta essa regiao para girar cada perna — no PSD do Vital
   * elas fazem parte do corpo, nao sao camada separada.
   *
   * Opcional de proposito: personagem sem esta medida simplesmente nao anima
   * as patas, em vez de quebrar. Sai do script ferramentas-patas.py.
   */
  pernas?: {
    /** Altura do quadril: acima disto e tronco, abaixo e perna. */
    quadril: number
    /** Linha vertical que separa uma perna da outra. */
    meio: number
    /** Centro de cada perna, que e o eixo de giro dela. */
    esquerda: number
    direita: number
  }
  base: string
  pecas: Peca[]
  oculto?: boolean
}

export interface Catalogo {
  personagens: Personagem[]
}

/** O que o cliente escolheu: no maximo um id de peca por slot. */
export type Escolhas = Partial<Record<SlotId, string>>

export interface Criacao {
  id: string
  uid: string
  autorNome: string
  /** Criações antigas não têm; nesses casos vale a galinha, que era a única. */
  personagem?: string
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
  /** Confirmou o link enviado por e-mail. Contas do Google já entram assim. */
  emailVerificado?: boolean
  admin?: boolean
}
