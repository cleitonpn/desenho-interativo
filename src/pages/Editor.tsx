import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Dices, Eraser, Images, Loader2, Save, Scan, Send, UserRound, X } from 'lucide-react'
import { CORES, MARCA, type CorId } from '../config/marca'
import { Galinha } from '../components/Galinha'
import { ProvaNaPele } from '../components/ProvaNaPele'
import { EnviarWhatsApp } from '../components/EnviarWhatsApp'
import { SLOTS, caminhoDaPeca, carregarCatalogo, pecasDoSlot } from '../lib/catalogo'
import { contarPecas, sortear } from '../lib/composicao'
import { preAquecer } from '../lib/exportar'
import { salvarCriacao } from '../lib/criacoes'
import { useAuth } from '../contexts/AuthContext'
import type { Catalogo, Escolhas, SlotId } from '../lib/tipos'

export function Editor() {
  const { usuario, perfil } = useAuth()
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [escolhas, setEscolhas] = useState<Escolhas>({})
  const [cor, setCor] = useState<CorId>('vermelho')
  const [slotAberto, setSlotAberto] = useState<SlotId | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [pele, setPele] = useState(false)
  const [enviar, setEnviar] = useState(false)

  useEffect(() => {
    carregarCatalogo().then((c) => { setCatalogo(c); preAquecer(c) }).catch(() => {})
  }, [])

  const total = contarPecas(escolhas)

  /** Alternar: tocar de novo no item escolhido tira a peça. */
  function escolher(slot: SlotId, id: string) {
    setEscolhas((e) => (e[slot] === id ? { ...e, [slot]: undefined } : { ...e, [slot]: id }))
    setSalvo(false)
  }

  async function salvar() {
    if (!catalogo || !usuario || total === 0) return
    setSalvando(true)
    try {
      await salvarCriacao(usuario.uid, perfil?.nome ?? 'Alguém', escolhas, cor)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2400)
    } finally {
      setSalvando(false)
    }
  }

  if (!catalogo) {
    return (
      <div className="min-h-dvh grid place-items-center text-muted">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="safe-top px-5 pt-5 flex items-center justify-between">
        <span className="font-display text-lg">{MARCA.nome}</span>
        <div className="flex items-center gap-2">
          <SeletorDeCor cor={cor} aoTrocar={setCor} />
          <Link to="/minhas" className="botao-neutro !px-3 !py-2" aria-label="Minhas galinhas">
            <Images size={18} />
          </Link>
          <Link to="/conta" className="botao-neutro !px-3 !py-2" aria-label="Minha conta">
            <UserRound size={18} />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 py-4 flex items-center justify-center">
        <div className="papel moldura w-full max-w-sm p-5">
          <Galinha catalogo={catalogo} escolhas={escolhas} cor={cor} className="w-full" />
        </div>
      </main>

      <div className="px-5 flex flex-wrap gap-2 justify-center pb-3">
        <button onClick={() => { setEscolhas(sortear(catalogo)); setSalvo(false) }} className="botao-neutro !py-2.5">
          <Dices size={18} /> Sortear
        </button>
        <button onClick={() => { setEscolhas({}); setSalvo(false) }} disabled={total === 0}
                className="botao-neutro !py-2.5 disabled:opacity-40">
          <Eraser size={18} /> Limpar
        </button>
        <button onClick={() => setPele(true)} disabled={total === 0}
                className="botao-neutro !py-2.5 disabled:opacity-40">
          <Scan size={18} /> Na pele
        </button>
        <button onClick={salvar} disabled={total === 0 || salvando}
                className="botao-neutro !py-2.5 disabled:opacity-40">
          {salvando ? <Loader2 size={18} className="animate-spin" />
            : salvo ? <Check size={18} className="text-brand" /> : <Save size={18} />}
          {salvo ? 'Salva!' : 'Salvar'}
        </button>
        <button onClick={() => setEnviar(true)} disabled={total === 0} className="botao-principal !py-2.5 disabled:opacity-40">
          <Send size={18} /> Mandar pro Vital
        </button>
      </div>

      <MenuDeSlots catalogo={catalogo} escolhas={escolhas} aberto={slotAberto}
                   aoAbrir={setSlotAberto} aoEscolher={escolher} cor={cor} />

      {pele && <ProvaNaPele catalogo={catalogo} escolhas={escolhas} cor={cor} aoFechar={() => setPele(false)} />}
      {enviar && <EnviarWhatsApp catalogo={catalogo} escolhas={escolhas} cor={cor} aoFechar={() => setEnviar(false)} />}
    </div>
  )
}

function SeletorDeCor({ cor, aoTrocar }: { cor: CorId; aoTrocar: (c: CorId) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-full border-2 border-ink/15 bg-surface">
      {(Object.keys(CORES) as CorId[]).map((id) => (
        <button key={id} onClick={() => aoTrocar(id)} aria-label={`Versão ${CORES[id].rotulo}`}
          className={`w-7 h-7 rounded-full border-2 transition-transform ${
            cor === id ? 'border-ink scale-100' : 'border-transparent scale-90 opacity-60'}`}
          style={{ background: CORES[id].amostra } as React.CSSProperties} />
      ))}
    </div>
  )
}

interface MenuProps {
  catalogo: Catalogo
  escolhas: Escolhas
  cor: CorId
  aberto: SlotId | null
  aoAbrir: (s: SlotId | null) => void
  aoEscolher: (s: SlotId, id: string) => void
}

function MenuDeSlots({ catalogo, escolhas, cor, aberto, aoAbrir, aoEscolher }: MenuProps) {
  const pecas = useMemo(() => (aberto ? pecasDoSlot(catalogo, aberto) : []), [catalogo, aberto])
  const slotAtual = SLOTS.find((s) => s.id === aberto)

  return (
    <nav className="border-t-2 border-ink/10 bg-surface safe-bottom">
      {aberto && slotAtual && (
        <div className="animate-sheet-up border-b-2 border-ink/10">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="etiqueta">{slotAtual.rotulo} · {pecas.length} opções</span>
            <button onClick={() => aoAbrir(null)} className="text-muted hover:text-ink" aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-4">
            {pecas.map((p) => {
              const ativa = escolhas[aberto] === p.id
              return (
                <button key={p.id} onClick={() => aoEscolher(aberto, p.id)}
                  className={`shrink-0 w-24 rounded-xl border-2 p-2 transition-all ${
                    ativa ? 'border-brand bg-brand-soft' : 'border-ink/10 hover:border-ink/25'}`}>
                  <div className="h-16 grid place-items-center">
                    <img src={caminhoDaPeca(p)} alt="" className="max-h-16 max-w-full object-contain"
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

      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {SLOTS.map((s) => {
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
