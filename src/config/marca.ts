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
 * A curva que transforma o traco vermelho em nanquim.
 *
 * O ponto delicado: nas camadas do Vital, o branco NAO e ausencia de cor — e
 * tinta opaca, usada para esconder o que esta embaixo (o chapeu cobre a crista,
 * o oculos cobre o olho). 77 das 100 pecas dependem disso. Por isso a conversao
 * nao pode ser um brightness/contrast, que escureceria o branco junto e deixaria
 * uma mancha cinza no lugar do recorte.
 *
 * A tabela abaixo e uma curva de luminancia que puxa os tons medios para baixo
 * e deixa o 1.0 intacto:
 *   traco  #FF1A0E (lum .29) -> .107  quase preto
 *   sombra #FF655D (lum .52) -> .322  cinza medio
 *   branco #FFFFFF (lum 1.0) -> 1.0   branco puro, mascara preservada
 */
export const CURVA_PRETO = [0, 0.07, 0.3, 0.55, 1] as const

/** Pesos de luminancia do feColorMatrix saturate(0), para a tela e o canvas
 *  chegarem exatamente ao mesmo resultado. */
export const LUMINANCIA = { r: 0.213, g: 0.715, b: 0.072 } as const

/** Aplica CURVA_PRETO a um valor 0..255, interpolando entre os pontos. */
export function curvaPreto(valor: number): number {
  const x = (valor / 255) * (CURVA_PRETO.length - 1)
  const i = Math.min(Math.floor(x), CURVA_PRETO.length - 2)
  const t = x - i
  return (CURVA_PRETO[i] + (CURVA_PRETO[i + 1] - CURVA_PRETO[i]) * t) * 255
}

/** As duas versoes de cor do desenho. O preto sai do mesmo PNG vermelho: em
 *  nenhum momento um acessorio precisa existir duas vezes. */
export const CORES = {
  vermelho: { id: 'vermelho', rotulo: 'Vermelho', filtro: 'none', amostra: '#FF1A0E' },
  preto: { id: 'preto', rotulo: 'Preto', filtro: 'url(#quintal-preto)', amostra: '#1B1B1B' },
} as const

export type CorId = keyof typeof CORES
