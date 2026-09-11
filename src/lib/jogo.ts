import type { Escolhas, Peca, Personagem, SlotId } from './tipos'

/**
 * O mundo do jogo: física, fase e colisão, sem React e sem DOM.
 *
 * A decisão que sustenta tudo isto: a galinha do Vital é desenhada DE FRENTE.
 * Um jogo de lado — Sonic, Mario — exigiria o Vital redesenhar os 99
 * acessórios de perfil. De frente, o personagem do jogo é exatamente o mesmo
 * componente do editor, e um acessório que cai de uma caixa já se encaixa
 * sozinho, pelo offset que a peça guarda desde o PSD. Zero arte nova.
 *
 * Por isso ele corre "para a câmera" com gingado e squash em vez de ter ciclo
 * de caminhada: é o que um boneco de frente permite, e lê como corrida.
 */

/**
 * Tudo em "unidades": a altura visível vale sempre 10, seja num celular de
 * 320px ou num monitor. Assim a física é uma só — nada de pulo que muda de
 * altura conforme a tela, que é onde jogo em HTML costuma quebrar.
 */
export const MUNDO = {
  /**
   * Quantas unidades cabem na altura da janela — ou seja, o zoom. O conteúdo
   * ocupa 6.4 (chão + cabeça no ápice do pulo); 7.2 deixa uma folga de céu sem
   * transformar a galinha num inseto no meio da tela.
   */
  altura: 7.2,
  /** Espessura da faixa de chão, contada de baixo para cima. */
  chao: 0.9,
  gravidade: 46,
  impulso: 16,
  velocidade: 6.8,
  /** Quadro do bicho. A proporção sai do enquadramento do próprio catálogo. */
  alturaBicho: 2.9,
  /**
   * Caixa de colisão do corpo, de propósito menor que o desenho: um chapéu
   * alto ou uma capa larga passam da silhueta, e ninguém deve ganhar alcance
   * de pulo por ter pegado um acessório grande.
   */
  colisao: { largura: 1.1, altura: 2.4 },
  /**
   * A caixa fica a 4.3 do chão. O topo do corpo chega a 2.4 parado e a 5.2 no
   * ápice do pulo — sobra folga, então acertar exige pular mas não exige
   * precisão de pixel.
   */
  caixa: { largura: 1.5, altura: 1.1, base: 4.3 },
  /**
   * Onde o acessório fica pairando. Acima da cabeça de quem está em pé: pegar
   * exige pular nele, e é exatamente aí que mora a escolha — quem não quiser
   * o item simplesmente passa por baixo.
   */
  itemPaira: 2.9,
  itemTamanho: 1.35,
  /** Minhoca: anda devagar pelo chão e some se for pisada por cima. Encostar
   *  de lado não faz nada — ela é bônus, não ameaça. */
  minhoca: { largura: 1.05, altura: 0.5, velocidade: 1.3 },
  /**
   * Poça de tinta: o perigo. Fica parada no chão e tem de ser pulada. É baixa
   * e estreita de propósito — um pulo cobre 4.8 unidades e ela tem 1.7, então
   * quem vê a tempo passa por cima sem esforço. A dificuldade é notar.
   */
  poca: { largura: 1.4, altura: 0.36 },
  pontosMinhoca: 25,
  pontosAcessorio: 50,
  pontosRepetida: 15,
  /**
   * Piscando depois do susto. Generoso de propósito: quem está aprendendo
   * passa a partida no ar e cai onde calha, e sem esta folga atravessava uma
   * sequência de poças perdendo uma peça em cada.
   */
  invencivel: 1.8,
  duracao: 60,
  /** Distância entre caixas. Na vertical o zoom aproximou tudo, e a janela
   *  passou a mostrar ~10 unidades de largura: com vãos maiores, a próxima
   *  caixa nasceria fora de vista e a corrida viraria caminhada às cegas. */
  vaoMin: 6,
  vaoMax: 11.5,
  /** Sai de cena o que ficou para trás disto. Ainda dá para voltar buscar. */
  alcance: 60,
} as const

export interface Caixa { id: number; x: number; pecaId: string; aberta: boolean }

export interface Minhoca { id: number; x: number; vx: number; viva: boolean }

export interface Poca { id: number; x: number }

export interface Item {
  id: number
  pecaId: string
  x: number
  y: number
  vx: number
  vy: number
  /** Enquanto voa não pode ser pego: senão quem abriu a caixa pegaria de graça
   *  na descida, e a escolha deixaria de existir. */
  pousado: boolean
  pego: boolean
}

export interface Bicho {
  x: number
  /** Altura dos pés acima do chão. */
  y: number
  vy: number
  noChao: boolean
  /** -1, 0 ou 1. Só inclina o desenho; de frente não há espelhamento. */
  direcao: number
  /** Fase do gingado, 0..1, avança só quando anda. */
  passo: number
}

export interface Estado {
  tempo: number
  bicho: Bicho
  caixas: Caixa[]
  itens: Item[]
  minhocas: Minhoca[]
  pocas: Poca[]
  camera: number
  /** Largura visível em unidades — depende do formato da tela. */
  larguraVista: number
  /** Ids de peça resgatados nesta partida, sem repetir. É a coleção. */
  resgatadas: string[]
  /** A pontuação: peça vestida e minhoca pisada somam aqui. É o número do
   *  ranking, enquanto `resgatadas` é o quanto do acervo a pessoa já viu. */
  pontos: number
  /** Segundos restantes de invencibilidade depois de pisar numa poça. */
  piscando: number
  /** O que está vestido agora: no máximo um id por slot, como no editor. */
  vestido: Escolhas
  proximoX: number
  /**
   * Quanto tempo ainda vale um pedido de pulo feito no ar. É o "buffer" dos
   * jogos de plataforma: quem aperta um instante antes de encostar no chão
   * pula assim que encosta, em vez de ser punido por ter apertado cedo demais.
   */
  bufferPulo: number
  seq: number
  rng: () => number
  acervo: Peca[]
  acabou: boolean
}

/**
 * `pular` é um PEDIDO, não "o botão está apertado". Quem aperta liga a
 * bandeira; quem consome é a simulação. A diferença importa: um toque rápido
 * pode começar e terminar entre dois quadros, e se a física só olhasse o
 * estado atual do botão o pulo simplesmente não aconteceria. Assim nenhum
 * toque se perde, por mais curto que seja.
 */
export type Comando = { esquerda: boolean; direita: boolean; pular: boolean }

export type Evento =
  | { tipo: 'abriu'; peca: Peca }
  | { tipo: 'pegou'; peca: Peca; inedita: boolean }
  | { tipo: 'pisou'; pontos: number }
  | { tipo: 'sujou'; peca: Peca | null }
  | { tipo: 'fim' }

/**
 * Gerador com semente. Hoje serve para eu reproduzir uma fase exata quando
 * algo sai errado; quando existir ranking, é o que vai permitir conferir uma
 * partida em vez de confiar na pontuação que o aparelho mandou.
 */
export function geradorComSemente(semente: number): () => number {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Tudo que pode sair de uma caixa: o acervo do bicho, menos a base. */
export function pecasJogaveis(personagem: Personagem): Peca[] {
  return personagem.pecas.filter((p) => p.slot !== 'base' && !p.oculta)
}

export function comecar(personagem: Personagem, larguraVista: number, semente = Date.now()): Estado {
  const estado: Estado = {
    tempo: MUNDO.duracao,
    bicho: { x: 3, y: 0, vy: 0, noChao: true, direcao: 1, passo: 0 },
    caixas: [], itens: [], minhocas: [], pocas: [], camera: 0, larguraVista,
    resgatadas: [], pontos: 0, piscando: 0, vestido: {},
    proximoX: 9, bufferPulo: 0, seq: 0,
    rng: geradorComSemente(semente),
    acervo: pecasJogaveis(personagem),
    acabou: false,
  }
  gerarAdiante(estado)
  return estado
}

/**
 * Qual peça vem na próxima caixa. Prefere o que a pessoa ainda não resgatou e,
 * dentro disso, um slot ainda vazio: a galinha vai ganhando corpo ao longo da
 * partida em vez de trocar de chapéu sete vezes.
 */
function sortearPeca(e: Estado): Peca | null {
  if (!e.acervo.length) return null
  const ineditas = e.acervo.filter((p) => !e.resgatadas.includes(p.id))
  const bolo = ineditas.length ? ineditas : e.acervo
  const vagos = bolo.filter((p) => !e.vestido[p.slot as SlotId])
  const alvo = vagos.length ? vagos : bolo
  return alvo[Math.floor(e.rng() * alvo.length)]
}

function gerarAdiante(e: Estado): void {
  const ate = e.camera + e.larguraVista + MUNDO.vaoMax
  while (e.proximoX < ate) {
    const peca = sortearPeca(e)
    if (!peca) return
    const x = e.proximoX
    e.caixas.push({ id: e.seq++, x, pecaId: peca.id, aberta: false })
    const vao = MUNDO.vaoMin + e.rng() * (MUNDO.vaoMax - MUNDO.vaoMin)
    e.proximoX = x + vao

    // Começa mansa e vai apertando. Sem rampa, ou o início já é difícil demais
    // para quem nunca jogou, ou o fim continua sendo um passeio.
    const dificuldade = Math.min(x / 220, 1)
    // Nada de perigo nas primeiras caixas: dá tempo de entender o jogo antes
    // de ser punido por não entender.
    if (x < 22) continue

    // O chão entre uma caixa e a outra, de fora da zona de pouso das duas.
    const inicio = x + 2.4
    const fim = x + vao - 2.4
    // Vão curto não recebe perigo nenhum. Com 1.7 de poça espremida entre duas
    // zonas de pulo, a galinha caía da caixa direto na tinta — não havia
    // decisão, só castigo. O perigo precisa de espaço para ser visto e evitado.
    if (fim - inicio < 3.2) continue

    // Cada um na sua metade do vão: assim minhoca e poça nunca nascem uma em
    // cima da outra, e não vira uma decisão impossível de ler a tempo.
    const meio = (inicio + fim) / 2
    if (e.rng() < 0.4 + dificuldade * 0.25) {
      e.minhocas.push({
        id: e.seq++, x: inicio + e.rng() * (meio - inicio),
        vx: -(0.9 + e.rng() * 0.8), viva: true,
      })
    }
    // A poça demora mais a aparecer que a minhoca, e é mais rara.
    //
    // Quem só martela o pulo passa a partida no ar e cai onde calha: com a
    // densidade anterior levava sete banhos de tinta por partida e terminava
    // sem nada vestido. O castigo tem de ser do jogador que não olhou, não do
    // que ainda não aprendeu.
    if (x > 45 && e.rng() < 0.12 + dificuldade * 0.26) {
      e.pocas.push({ id: e.seq++, x: meio + e.rng() * (fim - meio) })
    }
  }
}

function acharPeca(e: Estado, id: string): Peca | undefined {
  return e.acervo.find((p) => p.id === id)
}

function encosta(ax: number, aw: number, ay: number, ah: number,
                 bx: number, bw: number, by: number, bh: number): boolean {
  return Math.abs(ax - bx) < (aw + bw) / 2 && ay < by + bh && by < ay + ah
}

/**
 * Pisar na tinta faz cair o acessório mais recente — e ele cai PARA TRÁS, no
 * chão, de onde dá para buscar de volta.
 *
 * É por isso que existe o botão de voltar. Perder a peça de vez seria castigo
 * demais para um jogo de um minuto; deixá-la largada no caminho transforma o
 * erro numa decisão: vale a pena gastar quatro segundos voltando, ou é melhor
 * seguir em frente e abrir mais duas caixas?
 *
 * Sem nada vestido não há o que derrubar, e aí o preço é tempo.
 */
function derrubarPeca(e: Estado): Peca | null {
  const vestidas = new Set(Object.values(e.vestido).filter(Boolean) as string[])
  // A mais recente das que estão no corpo: `resgatadas` guarda a ordem.
  const id = [...e.resgatadas].reverse().find((x) => vestidas.has(x))
  if (!id) { e.tempo = Math.max(0, e.tempo - 3); return null }

  const peca = acharPeca(e, id)
  e.resgatadas = e.resgatadas.filter((x) => x !== id)
  e.pontos = Math.max(0, e.pontos - MUNDO.pontosAcessorio)
  if (peca) e.vestido = { ...e.vestido, [peca.slot as SlotId]: undefined }
  if (peca) {
    e.itens.push({
      id: e.seq++, pecaId: peca.id,
      x: e.bicho.x, y: MUNDO.itemPaira + 0.6,
      vx: -(2.4 + e.rng() * 1.2), vy: 5, pousado: false, pego: false,
    })
  }
  return peca ?? null
}

/**
 * Um passo da simulação. Devolve o que aconteceu para a tela reagir — a física
 * não sabe o que é som, pontuação ou React.
 */
export function passo(e: Estado, dt: number, cmd: Comando): Evento[] {
  const eventos: Evento[] = []
  if (e.acabou) return eventos

  // Trava o passo: numa aba que ficou em segundo plano o dt vem gigante, e o
  // bicho atravessaria caixas e chão de uma vez só.
  const t = Math.min(dt, 1 / 30)

  e.tempo -= t
  if (e.tempo <= 0) {
    e.tempo = 0
    e.acabou = true
    eventos.push({ tipo: 'fim' })
    return eventos
  }

  const b = e.bicho
  const andar = (cmd.direita ? 1 : 0) - (cmd.esquerda ? 1 : 0)
  if (andar !== 0) {
    b.direcao = andar
    b.passo = (b.passo + t * 2.6) % 1
  }
  // Não deixa voltar antes do início: sem parede, a câmera mostraria o vazio.
  b.x = Math.max(1, b.x + andar * MUNDO.velocidade * t)

  // Consome o pedido e o guarda por um instante, em vez de ler o botão.
  if (cmd.pular) { e.bufferPulo = 0.12; cmd.pular = false }
  e.bufferPulo = Math.max(0, e.bufferPulo - t)
  if (e.bufferPulo > 0 && b.noChao) { b.vy = MUNDO.impulso; b.noChao = false; e.bufferPulo = 0 }

  const topoAntes = b.y + MUNDO.colisao.altura
  b.vy -= MUNDO.gravidade * t
  b.y += b.vy * t
  if (b.y <= 0) { b.y = 0; b.vy = 0; b.noChao = true }
  const topoAgora = b.y + MUNDO.colisao.altura

  // Caixa se abre por baixo, como manda a tradição: só subindo e só quando a
  // cabeça cruza a base dela neste quadro.
  if (b.vy > 0) {
    for (const caixa of e.caixas) {
      if (caixa.aberta) continue
      const alinhado = Math.abs(b.x - caixa.x) < (MUNDO.caixa.largura + MUNDO.colisao.largura) / 2
      if (!alinhado || topoAntes > MUNDO.caixa.base || topoAgora < MUNDO.caixa.base) continue

      caixa.aberta = true
      b.vy = -3 // rebate para baixo, para não atravessar a caixa
      const peca = acharPeca(e, caixa.pecaId)
      if (!peca) continue
      eventos.push({ tipo: 'abriu', peca })
      // O item sai de lado, e não em cima da caixa: caindo no mesmo lugar, quem
      // abriu a caixa pegaria sem querer na descida.
      e.itens.push({
        id: e.seq++, pecaId: peca.id,
        x: caixa.x, y: MUNDO.caixa.base + MUNDO.caixa.altura,
        vx: 3.6 + e.rng() * 1.6, vy: 8, pousado: false, pego: false,
      })
      break
    }
  }

  for (const item of e.itens) {
    if (item.pego) continue
    if (!item.pousado) {
      item.x += item.vx * t
      item.vy -= MUNDO.gravidade * t
      item.y += item.vy * t
      if (item.y <= MUNDO.itemPaira) { item.y = MUNDO.itemPaira; item.vy = 0; item.pousado = true }
      continue
    }
    const tocou = encosta(
      b.x, MUNDO.colisao.largura, b.y, MUNDO.colisao.altura,
      item.x, MUNDO.itemTamanho * 0.7, item.y, MUNDO.itemTamanho * 0.7)
    if (!tocou) continue

    item.pego = true
    const peca = acharPeca(e, item.pecaId)
    if (!peca) continue
    const inedita = !e.resgatadas.includes(peca.id)
    if (inedita) e.resgatadas.push(peca.id)
    e.pontos += inedita ? MUNDO.pontosAcessorio : MUNDO.pontosRepetida
    e.vestido = { ...e.vestido, [peca.slot as SlotId]: peca.id }
    eventos.push({ tipo: 'pegou', peca, inedita })
  }

  for (const m of e.minhocas) {
    if (!m.viva) continue
    m.x += m.vx * t
    const encostou = encosta(
      b.x, MUNDO.colisao.largura, b.y, MUNDO.colisao.altura,
      m.x, MUNDO.minhoca.largura, 0, MUNDO.minhoca.altura)
    // Só vale pisando: encostar de lado atravessa. A minhoca é prêmio de
    // pontaria, não armadilha — quem erra perde o ponto, não a partida.
    if (!encostou || b.vy >= 0) continue
    m.viva = false
    e.pontos += MUNDO.pontosMinhoca
    b.vy = 9 // quica, como manda o gênero
    eventos.push({ tipo: 'pisou', pontos: MUNDO.pontosMinhoca })
  }

  e.piscando = Math.max(0, e.piscando - t)
  if (e.piscando === 0) {
    for (const p of e.pocas) {
      const sujou = encosta(
        b.x, MUNDO.colisao.largura, b.y, MUNDO.colisao.altura,
        p.x, MUNDO.poca.largura, 0, MUNDO.poca.altura)
      if (!sujou) continue
      e.piscando = MUNDO.invencivel
      eventos.push({ tipo: 'sujou', peca: derrubarPeca(e) })
      break
    }
  }

  // Câmera à esquerda do bicho: sobra tela à frente, que é para onde se anda.
  e.camera = b.x - e.larguraVista * 0.35
  gerarAdiante(e)

  const limite = e.camera - MUNDO.alcance
  e.caixas = e.caixas.filter((c) => c.x > limite)
  e.itens = e.itens.filter((i) => !i.pego && i.x > limite)
  e.minhocas = e.minhocas.filter((m) => m.viva && m.x > limite)
  e.pocas = e.pocas.filter((p) => p.x > limite)

  return eventos
}

/**
 * A galinha montada no jogo precisa sobreviver à ida para o editor, e quem não
 * entrou ainda passa pela tela de login no caminho — o que apaga o state da
 * rota. Guardar na sessão é o que mantém a partida de pé nesse pulo.
 */
const CHAVE = 'quintal:partida'

type Partida = { personagem: string; escolhas: Escolhas }

/** Memória do que já foi lido. O editor chama isto durante o render, e o modo
 *  estrito do React renderiza duas vezes em desenvolvimento: sem isto, a
 *  segunda chamada acharia a sessão já esvaziada pela primeira. */
let lembrada: Partida | null | undefined

export function guardarPartida(personagem: string, escolhas: Escolhas): void {
  lembrada = undefined
  try { sessionStorage.setItem(CHAVE, JSON.stringify({ personagem, escolhas })) } catch { /* sessão bloqueada */ }
}

/** Lê e esquece: a partida só é reaproveitada uma vez. */
export function resgatarPartida(): Partida | null {
  if (lembrada !== undefined) return lembrada
  try {
    const cru = sessionStorage.getItem(CHAVE)
    sessionStorage.removeItem(CHAVE)
    lembrada = cru ? (JSON.parse(cru) as Partida) : null
  } catch { lembrada = null }
  return lembrada
}
