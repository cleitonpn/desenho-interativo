import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Check, Dices, Eraser, Images, Loader2, Save, Scan, Send, Shirt, UserRound, X,
} from 'lucide-react'
import { CORES, CORES_DO_EDITOR, type CorId } from '../config/marca'
import { Desenho } from '../components/Desenho'
import { ProvaNaPele } from '../components/ProvaNaPele'
import { EnviarWhatsApp } from '../components/EnviarWhatsApp'
import {
  caminhoDaPeca, carregarCatalogo, pecasDoSlot, personagemPadrao,
  personagensVisiveis, slotsDisponiveis,
} from '../lib/catalogo'
import { contarPecas, sortear } from '../lib/composicao'
import { preAquecer } from '../lib/exportar'
import { salvarCriacao } from '../lib/criacoes'
import { useAuth } from '../contexts/AuthContext'
import {
  iniciarSessao, registrarAcao, registrarConjunto, registrarPeca,
} from '../lib/telemetria'
import { registrarDescoberta, registrarMarco } from '../lib/progresso'
import type { Catalogo, Escolhas, Personagem, SlotId } from '../lib/tipos'

export function Editor() {
  const navegar = useNavigate()
  const { usuario, perfil } = useAuth()
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  // O desenho do dia chega pela navegação: abrir o editor já com ele montado
  // evita pedir para a pessoa refazer o que acabou de ver.
  const vindo = useLocation().state as { escolhas?: Escolhas; personagem?: string } | null
  const [escolhas, setEscolhas] = useState<Escolhas>(vindo?.escolhas ?? {})
  const [personagemId, setPersonagemId] = useState<string | null>(vindo?.personagem ?? null)
  const [cor, setCor] = useState<CorId>('vermelho')
  const [slotAberto, setSlotAberto] = useState<SlotId | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [pele, setPele] = useState(false)
  const [enviar, setEnviar] = useState(false)

  useEffect(() => {
    carregarCatalogo().then((c) => {
      setCatalogo(c)
      const inicial = c.personagens.find((p) => p.id === personagemId) ?? personagemPadrao(c)
      setPersonagemId(inicial.id)
      preAquecer(inicial, vindo?.escolhas)
    }).catch(() => {})
    // Só na montagem: trocar de personagem depois não deve recarregar o catálogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (usuario) iniciarSessao(usuario.uid) }, [usuario])

  const total = contarPecas(escolhas)

  /** Alternar: tocar de novo no item escolhido tira a peça. */
  function escolher(slot: SlotId, id: string) {
    setEscolhas((e) => {
      const tirando = e[slot] === id
      // "descarte" é a peça que a pessoa vestiu e tirou: diz tanto quanto a
      // escolhida, porque marca o que atraiu mas não convenceu.
      if (tirando) { registrarPeca(id, slot, 'descartes'); registrarAcao('remocao') }
      else {
        registrarPeca(id, slot, 'escolhas')
        registrarAcao('escolha_manual')
        if (usuario) void registrarDescoberta(usuario.uid, [id], personagemId ?? undefined)
      }
      return { ...e, [slot]: tirando ? undefined : id }
    })
    setSalvo(false)
  }

  async function salvar() {
    if (!personagem || !usuario || total === 0) return
    setSalvando(true)
    try {
      await salvarCriacao(usuario.uid, perfil?.nome ?? 'Alguém', escolhas, cor, personagem.id)
      registrarAcao('salvamento')
      registrarConjunto(escolhas, 'salvamentos')
      void registrarMarco(usuario.uid, 'salvas')
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2400)
    } finally {
      setSalvando(false)
    }
  }

  const personagem = catalogo && personagemId
    ? (catalogo.personagens.find((p) => p.id === personagemId) ?? personagemPadrao(catalogo))
    : null

  /** Trocar de bicho zera a montagem: um chapéu de galinha não serve num gato. */
  function trocarPersonagem(novo: Personagem) {
    setPersonagemId(novo.id)
    setEscolhas({})
    setSlotAberto(null)
    setSalvo(false)
    preAquecer(novo)
  }

  if (!catalogo || !personagem) {
    return (
      <div className="min-h-dvh grid place-items-center text-muted">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    // h-dvh + overflow-hidden: o editor cabe numa tela e nao rola. Quem manda
    // no espaco e o desenho, que encolhe quando a bandeja de pecas abre.
    //
    // No celular tudo empilha. No desktop as pecas vao para uma coluna lateral:
    // esticar a barra de baixo por 1400px deixaria "Mandar" com um metro de
    // largura e os controles nas pontas opostas da tela.
    <div className="h-dvh overflow-hidden flex flex-col lg:flex-row">
      <div className="flex flex-col flex-1 min-h-0">
      <header className="safe-top px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
        <Link to="/" className="botao-neutro !px-3 !py-2" aria-label="Voltar ao início">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <SeletorDeCor cor={cor} aoTrocar={setCor} />
          <button onClick={() => { registrarAcao('limpeza'); setEscolhas({}); setSalvo(false) }}
                  disabled={total === 0} aria-label="Limpar tudo" title="Limpar tudo"
                  className="botao-neutro !px-3 !py-2 disabled:opacity-40">
            <Eraser size={18} />
          </button>
          <Link to="/minhas" className="botao-neutro !px-3 !py-2" aria-label="Minhas criações">
            <Images size={18} />
          </Link>
          <Link to="/conta" className="botao-neutro !px-3 !py-2" aria-label="Minha conta">
            <UserRound size={18} />
          </Link>
        </div>
      </header>

      {personagensVisiveis(catalogo).length > 1 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto shrink-0">
          {personagensVisiveis(catalogo).map((p) => (
            <button key={p.id} onClick={() => trocarPersonagem(p)}
              className={`shrink-0 px-4 py-2 rounded-full border-2 font-semibold text-sm transition-colors ${
                p.id === personagem.id ? 'border-ink bg-ink text-canvas' : 'border-ink/15 text-muted'}`}>
              {p.nome}
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 min-h-0 px-4 pb-2 flex items-center justify-center">
        <div className="papel moldura p-3 w-full max-w-sm max-h-full flex lg:w-auto lg:max-w-none
                        lg:h-full">
          <Desenho personagem={personagem} escolhas={escolhas} cor={cor}
                   className="w-full h-auto lg:w-auto lg:h-full m-auto" />
        </div>
      </main>

      </div>

      <aside className="shrink-0 flex flex-col lg:w-[380px] lg:border-l-2 lg:border-ink/10
                        lg:min-h-0 lg:pt-4">
      <div className="px-4 pb-2 flex items-center gap-2 shrink-0 lg:flex-wrap">
        <button onClick={() => {
                  const sorteada = sortear(personagem)
                  registrarAcao('sorteio')
                  registrarConjunto(sorteada, 'escolhas')
                  if (usuario) {
                    void registrarDescoberta(
                      usuario.uid, Object.values(sorteada).filter(Boolean) as string[], personagem.id)
                  }
                  setEscolhas(sorteada); setSalvo(false)
                }} className="botao-neutro !px-3 min-[400px]:!px-4 !py-2.5 shrink-0"
                   aria-label="Sortear" title="Sortear">
          <Dices size={18} /> <span className="hidden min-[400px]:inline">Sortear</span>
        </button>

        <AcaoIcone rotulo="Ver numa camiseta" desabilitado={total === 0}
                   onClick={() => navegar('/loja', {
                     state: { arte: { tipo: 'galinha', escolhas, cor }, personagem: personagem.id },
                   })}>
          <Shirt size={18} />
        </AcaoIcone>
        <AcaoIcone rotulo="Ver na pele" onClick={() => { registrarAcao('prova_pele'); setPele(true) }}
                   desabilitado={total === 0}>
          <Scan size={18} />
        </AcaoIcone>
        <AcaoIcone rotulo={salvo ? 'Salva' : 'Salvar'} onClick={salvar} desabilitado={total === 0 || salvando}>
          {salvando ? <Loader2 size={18} className="animate-spin" />
            : salvo ? <Check size={18} className="text-brand" /> : <Save size={18} />}
        </AcaoIcone>

        <button onClick={() => setEnviar(true)} disabled={total === 0}
                className="botao-principal !px-4 !py-2.5 flex-1 min-w-0 lg:w-full lg:flex-none
                           disabled:opacity-40">
          <Send size={18} /> Mandar
        </button>
      </div>

      <MenuDeSlots personagem={personagem} escolhas={escolhas} aberto={slotAberto}
                   aoAbrir={setSlotAberto} aoEscolher={escolher} cor={cor} />

      </aside>

      {pele && <ProvaNaPele personagem={personagem} escolhas={escolhas} cor={cor} aoFechar={() => setPele(false)} />}
      {enviar && (
        <EnviarWhatsApp personagem={personagem} escolhas={escolhas} cor={cor}
                        aoFechar={() => setEnviar(false)} />
      )}
    </div>
  )
}

/** Ação secundária: só ícone, para as cinco ações caberem numa linha. */
function AcaoIcone({ rotulo, onClick, desabilitado, children }: {
  rotulo: string; onClick: () => void; desabilitado?: boolean; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} disabled={desabilitado} aria-label={rotulo} title={rotulo}
            className="botao-neutro !px-3 !py-2.5 shrink-0 disabled:opacity-40">
      {children}
    </button>
  )
}

function SeletorDeCor({ cor, aoTrocar }: { cor: CorId; aoTrocar: (c: CorId) => void }) {
  const trocar = (id: CorId) => { if (id !== cor) registrarAcao('troca_cor'); aoTrocar(id) }
  return (
    <div className="flex gap-1 p-1 rounded-full border-2 border-ink/15 bg-surface">
      {CORES_DO_EDITOR.map((id) => (
        <button key={id} onClick={() => trocar(id)} aria-label={`Versão ${CORES[id].rotulo}`}
          className={`w-7 h-7 rounded-full border-2 transition-transform ${
            cor === id ? 'border-ink scale-100' : 'border-transparent scale-90 opacity-60'}`}
          style={{ background: CORES[id].amostra } as React.CSSProperties} />
      ))}
    </div>
  )
}

interface MenuProps {
  personagem: Personagem
  escolhas: Escolhas
  cor: CorId
  aberto: SlotId | null
  aoAbrir: (s: SlotId | null) => void
  aoEscolher: (s: SlotId, id: string) => void
}

function MenuDeSlots({ personagem, escolhas, cor, aberto, aoAbrir, aoEscolher }: MenuProps) {
  const pecas = useMemo(() => (aberto ? pecasDoSlot(personagem, aberto) : []), [personagem, aberto])
  const slots = useMemo(() => slotsDisponiveis(personagem), [personagem])
  const slotAtual = slots.find((s) => s.id === aberto)

  return (
    <nav className="border-t-2 border-ink/10 bg-surface safe-bottom shrink-0
                    lg:border-t-0 lg:flex lg:flex-col-reverse lg:min-h-0 lg:flex-1">
      {aberto && slotAtual && (
        <div className="animate-sheet-up border-b-2 border-ink/10 lg:border-b-0 lg:border-t-2
                        lg:min-h-0 lg:flex lg:flex-col">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="etiqueta">{slotAtual.rotulo} · {pecas.length} opções</span>
            <button onClick={() => aoAbrir(null)} className="text-muted hover:text-ink" aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-4
                          lg:grid lg:grid-cols-3 lg:overflow-y-auto lg:overflow-x-visible">
            {pecas.map((p) => {
              const ativa = escolhas[aberto] === p.id
              return (
                <button key={p.id} onClick={() => aoEscolher(aberto, p.id)}
                  className={`shrink-0 w-24 lg:w-auto rounded-xl border-2 p-2 transition-all ${
                    ativa ? 'border-brand bg-brand-soft' : 'border-ink/10 hover:border-ink/25'}`}>
                  <div className="h-16 grid place-items-center">
                    <img src={caminhoDaPeca(p)} alt="" loading="lazy" decoding="async"
                         className="max-h-16 max-w-full object-contain miniatura-peca"
                         style={{ filter: CORES[cor].filtro }} />
                  </div>
                  <span className="block text-[11px] leading-tight mt-1.5 text-center text-muted line-clamp-2">
                    {p.rotulo}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto px-4 py-3 lg:flex-wrap lg:overflow-visible">
        {slots.map((s) => {
          const usado = Boolean(escolhas[s.id])
          const ativo = aberto === s.id
          return (
            <button key={s.id} onClick={() => aoAbrir(ativo ? null : s.id)}
              className={`shrink-0 px-4 py-2 rounded-full border-2 font-semibold text-sm transition-colors ${
                ativo ? 'border-ink bg-ink text-canvas'
                : usado ? 'border-brand text-brand' : 'border-ink/15 text-muted'}`}>
              <span className="mr-1">{s.emoji}</span>{s.rotulo}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
