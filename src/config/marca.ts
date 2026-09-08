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
  /**
   * Uma linha sobre o que e o lugar. Ela mudou quando o app deixou de ser so o
   * montador de bichos: hoje aqui tem tatuagem, ceramica e loja, e uma chamada
   * que fala so de bicho esconde metade do que o Vital faz.
   */
  chamada: 'Estúdio e ateliê do Vital Monteiro',
  /** O que existe aqui dentro, na ordem em que o visitante encontra. */
  oQueTem: 'Tatuagem, flash, cerâmica e camiseta.',
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

/**
 * A curva da estampa sobre tecido escuro. Nao e o espelho da de cima: espelhar
 * dava um traco acinzentado (#E3) e sombras de meio-tom, que sobre preto lem
 * como desenho sujo em vez de estampa.
 *
 * Aqui o traco vai a branco quase puro e as sombras descem bem mais, ficando
 * discretas — o desenho fica limpo, com o tecido aparecendo por dentro, que e
 * como uma estampa de uma cor se comporta de verdade.
 *
 *   traco  #FF1A0E (lum .29) -> .98  branco
 *   sombra #FF655D (lum .52) -> .48  cinza discreto
 *   branco #FFFFFF (lum 1.0) -> 0    vira o proprio tecido
 */
export const CURVA_BRANCO = [1, 1, 1, 0.94, 0.5, 0.38, 0.2, 0.08, 0] as const

/** Pesos de luminancia do feColorMatrix saturate(0), para a tela e o canvas
 *  chegarem exatamente ao mesmo resultado. */
export const LUMINANCIA = { r: 0.213, g: 0.715, b: 0.072 } as const

/** Interpola um valor 0..255 numa das curvas acima. */
export function aplicarCurvaEm(valor: number, curva: readonly number[]): number {
  const x = (valor / 255) * (curva.length - 1)
  const i = Math.min(Math.floor(x), curva.length - 2)
  const t = x - i
  return (curva[i] + (curva[i + 1] - curva[i]) * t) * 255
}

export function curvaDaCor(cor: CorId): readonly number[] | null {
  if (cor === 'preto') return CURVA_PRETO
  if (cor === 'branco') return CURVA_BRANCO
  return null
}

/**
 * As versoes de cor do desenho, todas saindo do mesmo PNG vermelho: em nenhum
 * momento um acessorio precisa existir duas vezes.
 *
 * 'branco' e a curva do preto espelhada, para estampa sobre tecido escuro — o
 * traco clareia e a mascara, que no papel e branca, escurece para continuar
 * escondendo o que esta embaixo. Sem ela, galinha preta em camiseta preta
 * simplesmente some.
 */
export const CORES = {
  vermelho: { id: 'vermelho', rotulo: 'Vermelho', filtro: 'none', amostra: '#FF1A0E' },
  preto: { id: 'preto', rotulo: 'Preto', filtro: 'url(#quintal-preto)', amostra: '#1B1B1B' },
  branco: { id: 'branco', rotulo: 'Branco', filtro: 'url(#quintal-branco)', amostra: '#F2F2F2' },
} as const

export type CorId = keyof typeof CORES

/** As duas que a pessoa escolhe no editor. A branca so existe sobre escuro. */
export const CORES_DO_EDITOR = ['vermelho', 'preto'] as const

/**
 * Sobre tecido escuro, o traco preto desaparece — troca sozinho para o branco.
 * O vermelho aguenta os dois fundos e fica como esta.
 */
export function corSobreTecido(cor: CorId, tecidoEscuro: boolean): CorId {
  if (!tecidoEscuro) return cor === 'branco' ? 'preto' : cor
  return cor === 'preto' ? 'branco' : cor
}
