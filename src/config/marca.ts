/**
 * Identidade do app. Trocar o nome do projeto significa mexer AQUI e em mais
 * nada: todas as telas, o titulo da aba, o texto do WhatsApp e a marca d'agua
 * das imagens exportadas leem destas constantes.
 */
export const MARCA = {
  /** Nome curto, usado no cabecalho e na marca d'agua. */
  nome: 'Quintal',
  /** Nome por extenso, usado na abertura e no titulo da aba. */
  nomeCompleto: 'O Quintal do Vital',
  /** Uma linha sobre o que e o lugar. */
  chamada: 'Onde os bichos do Vital ganham roupa',
  /** @ do artista, impresso no rodape das imagens exportadas. */
  arroba: '@vitalmonteirotattoo',
  /** Numero do Vital no formato aceito pelo wa.me (so digitos, com pais). */
  whatsapp: '5511948248742',
  instagram: 'https://instagram.com/vitalmonteirotattoo',
} as const

/**
 * As duas versoes de cor do desenho. O traco do Vital vem em vermelho nos
 * arquivos; o preto e obtido por filtro CSS, sem duplicar nenhum PNG.
 *
 * O filtro preserva os dois tons do desenho (traco forte + sombra clara):
 * grayscale leva #FF1A0E a um cinza medio e #FF655D a um cinza claro, e o
 * contraste/brilho reabre a distancia entre eles ate virar nanquim.
 */
export const CORES = {
  vermelho: { id: 'vermelho', rotulo: 'Vermelho', filtro: 'none', amostra: '#FF1A0E' },
  preto: { id: 'preto', rotulo: 'Preto', filtro: 'grayscale(1) contrast(1.6) brightness(0.6)', amostra: '#191919' },
} as const

export type CorId = keyof typeof CORES
