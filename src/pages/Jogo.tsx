import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronUp, Loader2, Play, RotateCcw } from 'lucide-react'
import { Desenho } from '../components/Desenho'
import {
  caminhoDaPeca, carregarCatalogo, personagemPadrao, personagensVisiveis,
} from '../lib/catalogo'
import {
  comecar, guardarPartida, MUNDO, passo, pecasJogaveis,
  type Caixa, type Comando, type Estado, type Item, type Minhoca, type Poca,
} from '../lib/jogo'
import { useAuth } from '../contexts/AuthContext'
import { registrarDescoberta } from '../lib/progresso'
import type { Catalogo, Escolhas, Peca, Personagem } from '../lib/tipos'

/**
 * O corpo não encosta na borda do enquadramento — sobram ~15% embaixo, onde
 * entram sapatos e meias. Afundar o quadro nessa proporção põe o pé no chão em
 * vez de deixar a galinha flutuando.
 */
const AFUNDA = 0.12

/**
 * Proporção da janela de jogo.
 *
 * Num celular em pé a largura é sempre o limite, então a proporção decide a
 * altura — e com ela o zoom. Mais larga mostra mais caminho à frente; mais
 * quadrada deixa a galinha maior. 1.15 mostra ~8.3 unidades de largura, ou
 * seja uns 5.4 à frente da galinha: sobra quase um segundo para ver a caixa
 * chegando, que é mais do que o pulo precisa.
 */
const FORMATO = 1.15

type Fase = 'abertura' | 'jogando' | 'fim'

export function Jogo() {
  const navegar = useNavigate()
  const { usuario } = useAuth()
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [personagemId, setPersonagemId] = useState<string | null>(null)
  const [fase, setFase] = useState<Fase>('abertura')

  // O que muda pouco mora no React; o que muda 60 vezes por segundo mora em
  // ref e é escrito direto no style. Misturar os dois é o que faz jogo em
  // HTML engasgar.
  const estadoRef = useRef<Estado | null>(null)
  const comandoRef = useRef<Comando>({ esquerda: false, direita: false, pular: false })
  const nosRef = useRef(new Map<string, HTMLElement>())
  const relogioRef = useRef<HTMLSpanElement | null>(null)
  const bichoRef = useRef<HTMLDivElement | null>(null)
  const sombraRef = useRef<HTMLDivElement | null>(null)
  const ceuRef = useRef<HTMLDivElement | null>(null)
  const chaoRef = useRef<HTMLDivElement | null>(null)
  const chaveRef = useRef('')
  const jaBaixadas = useRef(new Set<string>())

  // Ref de callback, e não useRef: a janela de jogo só entra no DOM depois que
  // o catálogo chega, e um efeito preso a useRef seria executado antes disso —
  // mediria null, desistiria, e nunca mais rodaria.
  const [vista, setVista] = useState<HTMLDivElement | null>(null)
  const [medidas, setMedidas] = useState({ escala: 0, larguraVista: 13.3 })
  const [cena, setCena] = useState<{ caixas: Caixa[]; itens: Item[]; minhocas: Minhoca[]; pocas: Poca[] }>(
    { caixas: [], itens: [], minhocas: [], pocas: [] })
  const [pontos, setPontos] = useState(0)
  // Dois booleanos, e não a fase do passo: o ciclo da perna é periódico e vive
  // no CSS, então o React só refaz o desenho quando ela começa ou para.
  const [patas, setPatas] = useState({ andando: false, noAr: false })
  const [vestido, setVestido] = useState<Escolhas>({})
  const [resgatadas, setResgatadas] = useState<string[]>([])
  const [aviso, setAviso] = useState<{ texto: string; tom: 'bom' | 'neutro' | 'ruim' } | null>(null)

  useEffect(() => {
    carregarCatalogo()
      .then((c) => { setCatalogo(c); setPersonagemId(personagemPadrao(c).id) })
      .catch(() => {})
  }, [])

  const personagem = useMemo(
    () => (catalogo ? (catalogo.personagens.find((p) => p.id === personagemId)
      ?? personagemPadrao(catalogo)) : null),
    [catalogo, personagemId])

  const acervo = useMemo(() => (personagem ? pecasJogaveis(personagem) : []), [personagem])
  const porId = useMemo(() => new Map(acervo.map((p) => [p.id, p])), [acervo])

  /** A escala sai da altura da janela de jogo: a física é sempre a mesma, em
   *  unidades, e só a conversão para pixel muda de aparelho para aparelho. */
  useEffect(() => {
    if (!vista) return
    const medir = () => {
      const r = vista.getBoundingClientRect()
      if (!r.height) return
      const escala = r.height / MUNDO.altura
      const larguraVista = r.width / escala
      setMedidas({ escala, larguraVista })
      // A partida em andamento aprende a nova largura na hora: girar o aparelho
      // no meio do jogo não pode deixar de gerar caixas adiante.
      if (estadoRef.current) estadoRef.current.larguraVista = larguraVista
    }
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(vista)
    return () => obs.disconnect()
  }, [vista])

  function jogar() {
    if (!personagem) return
    estadoRef.current = comecar(personagem, medidas.larguraVista)
    chaveRef.current = ''
    jaBaixadas.current.clear()
    setCena({ caixas: [], itens: [], minhocas: [], pocas: [] })
    setVestido({})
    setResgatadas([])
    setPontos(0)
    setAviso(null)
    setFase('jogando')
  }

  /** Posiciona tudo. Uma escrita de transform por elemento, por quadro. */
  const desenhar = useCallback((e: Estado) => {
    const { escala } = medidas
    if (!escala) return
    const nos = nosRef.current
    const b = e.bicho

    if (ceuRef.current) ceuRef.current.style.backgroundPositionX = `${-e.camera * escala * 0.35}px`
    if (chaoRef.current) chaoRef.current.style.backgroundPositionX = `${-e.camera * escala}px`

    const alturaBicho = MUNDO.alturaBicho * escala
    if (bichoRef.current) {
      const andando = comandoRef.current.esquerda || comandoRef.current.direita
      // Squash and stretch: estica subindo, achata caindo. Dá peso ao salto.
      const estica = b.noChao ? 0 : Math.max(-0.13, Math.min(0.13, b.vy * 0.012))
      // O corpo sobe e desce no ritmo do passo. O balanço de lado que havia
      // antes saiu: quem anda são as patas, e o corpo jogando de um lado para
      // o outro parecia que a galinha escorregava, não que caminhava.
      const saltito = b.noChao && andando ? Math.abs(Math.sin(b.passo * Math.PI * 2)) * 0.045 : 0
      bichoRef.current.style.transform =
        `translate3d(${(b.x - e.camera) * escala - (alturaBicho * 0.7275) / 2}px,` +
        `${-(b.y + saltito) * escala + alturaBicho * AFUNDA}px, 0)` +
        ` scale(${1 - estica}, ${1 + estica})`
      // Pisca depois da poça, para ficar claro que o susto já passou.
      bichoRef.current.style.opacity =
        e.piscando > 0 && Math.floor(e.piscando * 12) % 2 === 0 ? '0.35' : '1'
    }
    if (sombraRef.current) {
      // A sombra fica no chão e encolhe com a altura: sem ela não dá para saber
      // onde a galinha vai cair.
      const alto = Math.min(b.y / 3, 1)
      sombraRef.current.style.transform =
        `translate3d(${(b.x - e.camera) * escala - alturaBicho * 0.28}px, 0, 0)` +
        ` scale(${1 - alto * 0.45})`
      sombraRef.current.style.opacity = `${0.28 - alto * 0.18}`
    }

    const largCaixa = MUNDO.caixa.largura * escala
    for (const c of e.caixas) {
      const no = nos.get(`c${c.id}`)
      if (!no) continue
      no.style.transform =
        `translate3d(${(c.x - e.camera) * escala - largCaixa / 2}px,` +
        `${-MUNDO.caixa.base * escala}px, 0)`
    }

    const largMinhoca = MUNDO.minhoca.largura * escala
    for (const m of e.minhocas) {
      const no = nos.get(`m${m.id}`)
      if (no) no.style.transform = `translate3d(${(m.x - e.camera) * escala - largMinhoca / 2}px, 0, 0)`
    }
    const largPoca = MUNDO.poca.largura * escala
    for (const p of e.pocas) {
      const no = nos.get(`p${p.id}`)
      if (no) no.style.transform = `translate3d(${(p.x - e.camera) * escala - largPoca / 2}px, 0, 0)`
    }

    const largItem = MUNDO.itemTamanho * escala
    for (const i of e.itens) {
      const no = nos.get(`i${i.id}`)
      if (!no) continue
      no.style.transform =
        `translate3d(${(i.x - e.camera) * escala - largItem / 2}px, ${-i.y * escala}px, 0)`
    }

    if (relogioRef.current) relogioRef.current.textContent = `${Math.ceil(e.tempo)}s`
  }, [medidas])

  /** O laço. Roda só enquanto a partida está de pé. */
  useEffect(() => {
    if (fase !== 'jogando') return
    let quadro = 0
    let anterior = performance.now()

    const rodar = (agora: number) => {
      quadro = requestAnimationFrame(rodar)
      const dt = (agora - anterior) / 1000
      anterior = agora
      const e = estadoRef.current
      // Aba escondida: o relógio não deve correr sem ninguém jogando.
      if (!e || document.hidden) return

      const eventos = passo(e, dt, comandoRef.current)
      desenhar(e)

      // Só dois booleanos chegam ao React, e só quando mudam de verdade.
      const andando = comandoRef.current.esquerda || comandoRef.current.direita
      setPatas((antes) => (antes.andando === andando && antes.noAr === !e.bicho.noChao
        ? antes : { andando, noAr: !e.bicho.noChao }))

      for (const ev of eventos) {
        if (ev.tipo === 'fim') {
          setVestido({ ...e.vestido })
          setFase('fim')
          if (usuario && e.resgatadas.length) {
            void registrarDescoberta(usuario.uid, e.resgatadas, personagem?.id)
          }
        }
        if (ev.tipo === 'pegou') {
          setVestido({ ...e.vestido })
          setResgatadas([...e.resgatadas])
          setPontos(e.pontos)
          setAviso({ texto: ev.peca.rotulo ?? ev.peca.id, tom: ev.inedita ? 'bom' : 'neutro' })
        }
        if (ev.tipo === 'pisou') {
          setPontos(e.pontos)
          setAviso({ texto: `+${ev.pontos}`, tom: 'bom' })
        }
        if (ev.tipo === 'sujou') {
          setVestido({ ...e.vestido })
          setResgatadas([...e.resgatadas])
          setPontos(e.pontos)
          setAviso({
            texto: ev.peca ? `Caiu: ${ev.peca.rotulo ?? ev.peca.id}` : 'Tinta! −3s',
            tom: 'ruim',
          })
        }
      }

      // A lista só volta ao React quando muda de verdade — nascer uma caixa,
      // abrir, sair de cena. O resto do quadro é só transform.
      const chave = e.caixas.map((c) => `${c.id}${c.aberta ? 'a' : ''}`).join() +
        '|' + e.itens.map((i) => `${i.id}${i.pousado ? 'p' : ''}`).join() +
        '|' + e.minhocas.map((m) => m.id).join() + '|' + e.pocas.map((p) => p.id).join()
      if (chave !== chaveRef.current) {
        chaveRef.current = chave
        setCena({
          caixas: [...e.caixas], itens: [...e.itens],
          minhocas: [...e.minhocas], pocas: [...e.pocas],
        })
        // Baixa só o que está prestes a aparecer. O editor já aprendeu essa:
        // carregar as 99 peças de uma vez custa 3,7 MB e não serve para nada.
        for (const c of e.caixas) {
          if (jaBaixadas.current.has(c.pecaId)) continue
          const peca = porId.get(c.pecaId)
          if (!peca) continue
          jaBaixadas.current.add(c.pecaId)
          new Image().src = caminhoDaPeca(peca)
        }
      }
    }

    quadro = requestAnimationFrame(rodar)
    return () => cancelAnimationFrame(quadro)
  }, [fase, desenhar, personagem, porId, usuario])

  /** O aviso do acessório some sozinho. */
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 1400)
    return () => clearTimeout(t)
  }, [aviso])

  /** Teclado, para quem estiver no computador. */
  useEffect(() => {
    if (fase !== 'jogando') return
    const mapa: Record<string, keyof Comando> = {
      ArrowLeft: 'esquerda', a: 'esquerda', A: 'esquerda',
      ArrowRight: 'direita', d: 'direita', D: 'direita',
      ArrowUp: 'pular', w: 'pular', W: 'pular', ' ': 'pular',
    }
    const tecla = (ligado: boolean) => (ev: KeyboardEvent) => {
      const acao = mapa[ev.key]
      if (!acao) return
      ev.preventDefault()
      // Segurar a tecla dispara repetição do sistema; para o pulo isso viraria
      // uma metralhadora. Só a primeira descida conta.
      if (acao === 'pular' && (ev.repeat || !ligado)) return
      comandoRef.current[acao] = ligado
    }
    const desce = tecla(true)
    const sobe = tecla(false)
    window.addEventListener('keydown', desce)
    window.addEventListener('keyup', sobe)
    return () => {
      window.removeEventListener('keydown', desce)
      window.removeEventListener('keyup', sobe)
    }
  }, [fase])

  const registrar = useCallback((chave: string) => (no: HTMLElement | null) => {
    if (no) nosRef.current.set(chave, no)
    else nosRef.current.delete(chave)
  }, [])

  if (!catalogo || !personagem) {
    return <div className="min-h-dvh grid place-items-center text-muted"><Loader2 className="animate-spin" /></div>
  }

  const { escala } = medidas
  const chaoPx = MUNDO.chao * escala
  const alturaBicho = MUNDO.alturaBicho * escala

  return (
    /*
     * Mesma disciplina do editor: uma coluna, fluxo normal, flex-wrap em toda
     * linha de botões. O único lugar com posição absoluta é DENTRO da janela de
     * jogo, que tem overflow escondido — nada ali pode escapar por cima do
     * resto da tela.
     */
    <div className="min-h-dvh flex flex-col select-none">
      <header data-cabecalho className="safe-top px-4 pt-3 pb-2 flex flex-wrap items-center justify-between gap-2">
        <Link to="/" className="botao-neutro !px-3 !py-2" aria-label="Voltar ao início">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <span className="font-display text-xl tabular-nums leading-none">
            {pontos}<span className="etiqueta ml-1">pts</span>
          </span>
          <span className="font-display text-base tabular-nums leading-none text-muted">
            {resgatadas.length}<span className="text-faint text-xs">/{acervo.length}</span>
          </span>
          <span ref={relogioRef}
                className="font-display text-xl tabular-nums leading-none text-brand w-12 text-right">
            {MUNDO.duracao}s
          </span>
        </div>
      </header>

      <main className="px-3 flex justify-center">
        {/* Uma conta só para a largura, como no editor: a altura fica limitada
            sem depender de o navegador apertar nada. */}
        <div ref={setVista} data-vista
             className="relative overflow-hidden rounded-2xl border-[2.5px] border-ink bg-canvas"
             style={{ width: `min(100%, calc(48dvh * ${FORMATO}))`, aspectRatio: `${FORMATO}` }}>
          <div ref={ceuRef} className="absolute inset-0 papel" />

          <div className="absolute left-0 right-0 bottom-0 border-t-[3px] border-ink bg-raised"
               style={{ height: chaoPx || 0 }}>
            <div ref={chaoRef} className="absolute inset-0 opacity-70" style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, rgb(var(--c-ink)/.16) 0 2px, transparent 2px 11px)',
            }} />
          </div>

          {/* Origem do mundo: o nível do chão. Todo objeto nasce aqui e só é
              deslocado por transform, que é o que o navegador faz de graça. */}
          <div className="absolute left-0" style={{ bottom: chaoPx || 0, width: 0, height: 0 }}>
            <div ref={sombraRef} className="absolute left-0 bottom-0 rounded-[50%] bg-ink"
                 style={{ width: alturaBicho * 0.56, height: alturaBicho * 0.1,
                          marginBottom: -alturaBicho * 0.05 }} />

            {cena.pocas.map((p) => (
              <div key={p.id} ref={registrar(`p${p.id}`)} className="absolute left-0 bottom-0 text-ink"
                   style={{ width: MUNDO.poca.largura * escala, height: MUNDO.poca.altura * escala }}>
                <PocaDesenho />
              </div>
            ))}

            {cena.minhocas.map((m) => (
              <div key={m.id} ref={registrar(`m${m.id}`)}
                   className="absolute left-0 bottom-0 text-brand animate-pairar"
                   style={{ width: MUNDO.minhoca.largura * escala,
                            height: MUNDO.minhoca.altura * escala }}>
                <MinhocaDesenho />
              </div>
            ))}

            {cena.caixas.map((c) => (
              <div key={c.id} ref={registrar(`c${c.id}`)}
                   className={`absolute left-0 bottom-0 grid place-items-center rounded-lg border-[2.5px]
                               border-ink transition-colors duration-200 ${
                     c.aberta ? 'bg-raised text-faint' : 'bg-surface text-brand'}`}
                   style={{ width: MUNDO.caixa.largura * escala, height: MUNDO.caixa.altura * escala,
                            boxShadow: `${escala * 0.06}px ${escala * 0.06}px 0 0 rgb(var(--c-ink))` }}>
                <span className="font-display leading-none" style={{ fontSize: escala * 0.6 }}>
                  {c.aberta ? '·' : '?'}
                </span>
              </div>
            ))}

            {cena.itens.map((i) => {
              const peca = porId.get(i.pecaId)
              if (!peca) return null
              return (
                <div key={i.id} ref={registrar(`i${i.id}`)} className="absolute left-0 bottom-0"
                     style={{ width: MUNDO.itemTamanho * escala, height: MUNDO.itemTamanho * escala }}>
                  <div className={`w-full h-full grid place-items-center ${i.pousado ? 'animate-pairar' : ''}`}>
                    {i.pousado && (
                      <span className="absolute inset-0 rounded-full border-2 border-dashed border-brand/45" />
                    )}
                    <img src={caminhoDaPeca(peca)} alt="" draggable={false}
                         className="max-w-[78%] max-h-[78%] object-contain miniatura-peca" />
                  </div>
                </div>
              )
            })}

            <div ref={bichoRef} className="absolute left-0 bottom-0 origin-bottom"
                 style={{ width: alturaBicho * 0.7275, height: alturaBicho }}>
              <Desenho personagem={personagem} escolhas={vestido} cor="vermelho"
                       className="w-full h-full" patas={patas} />
            </div>
          </div>

          {aviso && (
            <div className="absolute left-1/2 top-3 -translate-x-1/2 pointer-events-none animate-pop">
              <span className={`px-3 py-1.5 rounded-full border-2 text-xs font-semibold
                                whitespace-nowrap ${
                aviso.tom === 'bom' ? 'border-ink bg-brand text-white'
                : aviso.tom === 'ruim' ? 'border-ink bg-ink text-canvas'
                : 'border-ink bg-surface text-muted'}`}>
                {aviso.tom === 'bom' ? '✦ ' : aviso.tom === 'ruim' ? '✱ ' : ''}{aviso.texto}
              </span>
            </div>
          )}

          {fase !== 'jogando' && (
            <Cartaz fase={fase} personagem={personagem} vestido={vestido} resgatadas={resgatadas}
                    pontos={pontos} total={acervo.length} catalogo={catalogo} personagemId={personagemId}
                    aoTrocar={setPersonagemId} aoJogar={jogar}
                    aoEditar={() => {
                      guardarPartida(personagem.id, vestido)
                      navegar('/montar', { state: { escolhas: vestido, personagem: personagem.id } })
                    }} />
          )}
        </div>
      </main>

      <Coleta resgatadas={resgatadas} porId={porId} />

      <div className="mt-auto">
        <Controles comandoRef={comandoRef} ativo={fase === 'jogando'} />
      </div>
    </div>
  )
}

function Regra({ texto, children }: { texto: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {children}{texto}
    </span>
  )
}

/**
 * Minhoca e poça são desenhadas em código, e não em PNG: o Vital não precisa
 * desenhar nada para o jogo existir, e elas seguem a mesma linguagem grossa e
 * preta das caixas. Se um dia ele quiser desenhá-las à mão, é trocar aqui.
 */
function MinhocaDesenho() {
  return (
    <svg viewBox="0 0 44 18" className="w-full h-full overflow-visible" aria-hidden>
      <path d="M3 15 Q 9 3 15 13 T 27 12 Q 32 11 34 6"
            fill="none" stroke="currentColor" strokeWidth="4.6" strokeLinecap="round" />
      <circle cx="36" cy="5" r="4.4" fill="currentColor" />
      <circle cx="37.6" cy="4" r="1.1" fill="rgb(var(--c-surface))" />
    </svg>
  )
}

function PocaDesenho() {
  return (
    <svg viewBox="0 0 72 16" preserveAspectRatio="none" className="w-full h-full" aria-hidden>
      <path d="M4 16 C 2 9 8 5 15 7 C 21 8 24 2 33 4 C 40 5 44 10 51 8
               C 58 6 66 8 68 16 Z" fill="currentColor" />
    </svg>
  )
}

/**
 * O que já caiu nesta partida. Ocupa a faixa que sobra entre a janela e o
 * comando com a única coisa que o jogador quer olhar ali: o que ele ganhou.
 */
function Coleta({ resgatadas, porId }: { resgatadas: string[]; porId: Map<string, Peca> }) {
  // Antes de juntar qualquer coisa esta faixa mostra as regras, com os mesmos
  // símbolos que aparecem no jogo. Ler "pule por baixo da caixa" ao lado do
  // desenho da caixa ensina mais rápido do que um parágrafo no cartaz.
  if (!resgatadas.length) {
    return (
      <div className="px-4 py-3 flex flex-wrap justify-center items-center gap-x-4 gap-y-2
                      text-[11px] text-muted">
        <Regra texto="pule por baixo">
          <span className="w-6 h-[18px] rounded border-2 border-ink bg-surface grid place-items-center
                           font-display text-[9px] text-brand leading-none">?</span>
        </Regra>
        <Regra texto={`pise em cima · ${MUNDO.pontosMinhoca} pts`}>
          <span className="w-6 h-[14px] text-brand"><MinhocaDesenho /></span>
        </Regra>
        <Regra texto="pule por cima">
          <span className="w-6 h-[10px] text-ink"><PocaDesenho /></span>
        </Regra>
      </div>
    )
  }
  return (
    // Altura em pixel, não em rem: é uma tira de figurinha, não texto. Em rem
    // ela cresceria junto com a fonte do sistema e comeria a tela.
    <div className="flex gap-2 overflow-x-auto px-4 py-3">
      {resgatadas.map((id) => {
        const peca = porId.get(id)
        if (!peca) return null
        return (
          <div key={id} title={peca.rotulo ?? id}
               className="shrink-0 w-[56px] h-[56px] rounded-xl border-2 border-ink/10 bg-surface
                          grid place-items-center p-1.5 animate-pop">
            <img src={caminhoDaPeca(peca)} alt={peca.rotulo ?? ''} loading="lazy"
                 className="max-w-full max-h-full object-contain miniatura-peca" />
          </div>
        )
      })}
    </div>
  )
}

/**
 * Telas de abertura e de fim. Ficam DENTRO da janela de jogo, e não como
 * modal sobre a página: assim não há chance de cobrir os controles.
 */
function Cartaz({ fase, personagem, vestido, resgatadas, pontos, total, catalogo, personagemId, aoTrocar, aoJogar, aoEditar }: {
  fase: Fase; personagem: Personagem; vestido: Escolhas; resgatadas: string[]
  pontos: number; total: number
  catalogo: Catalogo; personagemId: string | null
  aoTrocar: (id: string) => void; aoJogar: () => void; aoEditar: () => void
}) {
  const bichos = personagensVisiveis(catalogo)
  return (
    // Fundo opaco, e não translúcido: com o mundo aparecendo por trás, o
    // desenho da galinha do cartaz brigava com a galinha do jogo e o texto
    // ficava ilegível em cima do chão listrado.
    <div className="absolute inset-0 bg-canvas overflow-y-auto
                    flex flex-col items-center justify-center text-center p-4 gap-3">
      {fase === 'abertura' ? (
        <>
          {/* Sem artigo antes do nome: o Vital já desenha outros bichos, e
              "do/da" erraria o gênero na metade deles. */}
          <h1 className="font-display text-xl leading-tight">{personagem.nome} na corrida</h1>
          {/* O cartaz fica curto de propósito: as regras moram na faixa
              abaixo da janela, que estava vazia. Um cartaz com tudo escrito
              empurrava o botão de começar para fora da vista em tela pequena. */}
          <p className="text-xs text-muted max-w-[30ch] leading-relaxed">
            Junte acessórios em {MUNDO.duracao} segundos. As regras estão logo abaixo.
          </p>
          {bichos.length > 1 && (
            <div className="flex gap-2 flex-wrap justify-center">
              {bichos.map((b) => (
                <button key={b.id} onClick={() => aoTrocar(b.id)}
                  className={`px-3 py-1.5 rounded-full border-2 text-xs font-semibold ${
                    b.id === personagemId ? 'border-ink bg-ink text-canvas' : 'border-ink/15 text-muted'}`}>
                  {b.nome}
                </button>
              ))}
            </div>
          )}
          <button onClick={aoJogar} className="botao-principal !px-5 !py-2.5 mt-1">
            <Play size={18} /> Começar
          </button>
        </>
      ) : (
        <>
          <p className="etiqueta">Fim da corrida</p>
          <p className="font-display text-3xl leading-none">{pontos} pts</p>
          <p className="text-xs text-muted -mt-1">
            {resgatadas.length === 0 ? 'nenhum acessório desta vez'
              : `${resgatadas.length} ${resgatadas.length === 1 ? 'acessório' : 'acessórios'} de ${total}`}
          </p>
          <div className="h-[34%] aspect-[0.7275] shrink-0">
            <Desenho personagem={personagem} escolhas={vestido} cor="vermelho" className="w-full h-full" />
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={aoJogar} className="botao-neutro !px-4 !py-2 text-sm">
              <RotateCcw size={16} /> De novo
            </button>
            <button onClick={aoEditar} className="botao-principal !px-4 !py-2 text-sm">
              Abrir no editor
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * O comando. Botões grandes e separados: o polegar esquerdo anda, o direito
 * pula, e os dois podem estar apertados ao mesmo tempo — daí o pointer capture
 * em vez de onClick.
 */
function Controles({ comandoRef, ativo }: { comandoRef: React.MutableRefObject<Comando>; ativo: boolean }) {
  const apertar = (acao: keyof Comando, ligado: boolean) => (ev: React.PointerEvent) => {
    ev.preventDefault()
    if (ligado) ev.currentTarget.setPointerCapture(ev.pointerId)
    // Andar é estado: vale enquanto o dedo está em cima. Pular é pedido: soltar
    // o botão não cancela, senão um toque curto se perderia entre dois quadros.
    if (ligado || acao !== 'pular') comandoRef.current[acao] = ligado
  }
  const props = (acao: keyof Comando) => ({
    onPointerDown: apertar(acao, true),
    onPointerUp: apertar(acao, false),
    onPointerCancel: apertar(acao, false),
    onLostPointerCapture: () => { if (acao !== 'pular') comandoRef.current[acao] = false },
    onContextMenu: (ev: React.MouseEvent) => ev.preventDefault(),
    // Tamanho em pixel, de propósito: um polegar é um polegar. Em rem, quem
    // aumenta a fonte do sistema ganha botões de 104px e a linha não cabe mais
    // na tela — foi assim que a página passou a rolar de lado.
    className: `botao-neutro touch-none !px-0 !py-0 w-[64px] h-[64px] shrink-0 transition-opacity ${
      ativo ? '' : 'opacity-35'}`,
  })
  return (
    <div data-controles className="px-4 pt-4 pb-5 safe-bottom flex items-center justify-between gap-3">
      <div className="flex gap-3">
        <button {...props('esquerda')} aria-label="Ir para trás"><ChevronLeft size={26} /></button>
        <button {...props('direita')} aria-label="Ir para frente"><ChevronRight size={26} /></button>
      </div>
      <button {...props('pular')} aria-label="Pular" className={`${props('pular').className} !bg-brand !text-white`}>
        <ChevronUp size={30} />
      </button>
    </div>
  )
}
