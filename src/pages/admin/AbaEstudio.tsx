import { useEffect, useState } from 'react'
import { Check, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import {
  carregarSobre, listarTattoos, publicarTattoo, removerTattoo, salvarSobre, subirFoto,
  type Sobre, type Tattoo,
} from '../../lib/conteudo'

/**
 * O que o Vital edita sobre ele mesmo e sobre o trabalho dele. Trocar uma foto
 * ou reescrever a bio nao pode depender de deploy.
 */
export function AbaEstudio() {
  const [sobre, setSobre] = useState<Sobre | null>(null)
  const [tattoos, setTattoos] = useState<Tattoo[] | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregarSobre().then(setSobre).catch(() => setErro('Não consegui carregar o conteúdo.'))
    listarTattoos().then(setTattoos).catch(() => setTattoos([]))
  }, [])

  if (erro) return <p className="moldura-sutil p-6 text-brand font-medium">{erro}</p>
  if (!sobre || !tattoos) {
    return <div className="grid place-items-center py-20 text-muted"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="space-y-10">
      <Bio sobre={sobre} aoMudar={setSobre} />
      <Galeria tattoos={tattoos} aoMudar={setTattoos} />
    </div>
  )
}

function Bio({ sobre, aoMudar }: { sobre: Sobre; aoMudar: (s: Sobre) => void }) {
  const [texto, setTexto] = useState(sobre.bio)
  const [salvo, setSalvo] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  async function salvar() {
    setOcupado(true)
    try {
      await salvarSobre({ bio: texto })
      aoMudar({ ...sobre, bio: texto })
      setSalvo(true); setTimeout(() => setSalvo(false), 2500)
    } finally { setOcupado(false) }
  }

  async function adicionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setOcupado(true)
    try {
      const url = await subirFoto(arquivo, 'sobre')
      const fotos = [...sobre.fotos, url]
      await salvarSobre({ fotos })
      aoMudar({ ...sobre, fotos })
    } finally { setOcupado(false) }
  }

  async function removerFoto(url: string) {
    const fotos = sobre.fotos.filter((f) => f !== url)
    await salvarSobre({ fotos })
    aoMudar({ ...sobre, fotos })
  }

  return (
    <section>
      <h2 className="font-display text-xl mb-1">Quem sou eu</h2>
      <p className="text-sm text-muted mb-4">
        Aparece na tela que o cliente abre para conhecer você. Pule uma linha para separar parágrafos.
      </p>

      <textarea value={texto} onChange={(e) => { setTexto(e.target.value); setSalvo(false) }}
                rows={8} placeholder="Comecei a desenhar…"
                className="campo resize-y leading-relaxed" />

      <button onClick={salvar} disabled={ocupado || texto === sobre.bio}
              className="botao-principal mt-3 !py-2.5 disabled:opacity-40">
        {ocupado ? <Loader2 size={16} className="animate-spin" />
          : salvo ? <Check size={16} /> : null}
        {salvo ? 'Salvo' : 'Salvar bio'}
      </button>

      <p className="etiqueta mt-7 mb-3">Fotos suas</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {sobre.fotos.map((foto) => (
          <figure key={foto} className="relative group">
            <img src={foto} alt="" className="w-full aspect-[4/5] object-cover rounded-xl border-2 border-ink/15" />
            <button onClick={() => removerFoto(foto)} aria-label="Remover foto"
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-surface border border-line
                               text-muted hover:text-brand opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 size={13} />
            </button>
          </figure>
        ))}
        <label className="aspect-[4/5] rounded-xl border-2 border-dashed border-ink/25 grid place-items-center
                          cursor-pointer text-muted hover:border-brand hover:text-brand transition-colors">
          <Plus size={22} />
          <input type="file" accept="image/*" className="hidden" onChange={adicionarFoto} />
        </label>
      </div>
    </section>
  )
}

function Galeria({ tattoos, aoMudar }: { tattoos: Tattoo[]; aoMudar: (t: Tattoo[]) => void }) {
  const [legenda, setLegenda] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function adicionar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setOcupado(true)
    try {
      aoMudar([await publicarTattoo(arquivo, legenda.trim()), ...tattoos])
      setLegenda('')
    } finally { setOcupado(false) }
  }

  async function remover(t: Tattoo) {
    if (!confirm('Tirar essa foto da galeria?')) return
    await removerTattoo(t)
    aoMudar(tattoos.filter((x) => x.id !== t.id))
  }

  return (
    <section>
      <h2 className="font-display text-xl mb-1">Galeria de tattoos</h2>
      <p className="text-sm text-muted mb-4">
        {tattoos.length} {tattoos.length === 1 ? 'foto' : 'fotos'} no ar.
      </p>

      <div className="flex flex-wrap gap-2 items-center mb-5">
        <input value={legenda} onChange={(e) => setLegenda(e.target.value)}
               placeholder="Legenda (opcional)" className="campo flex-1 min-w-[200px]" />
        <label className="botao-principal cursor-pointer !py-2.5 shrink-0">
          {ocupado ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          Enviar foto
          <input type="file" accept="image/*" className="hidden" onChange={adicionar} disabled={ocupado} />
        </label>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {tattoos.map((t) => (
          <figure key={t.id} className="relative group">
            <img src={t.arquivo} alt={t.legenda} loading="lazy"
                 className="w-full aspect-square object-cover rounded-xl border-2 border-ink/15" />
            {t.legenda && <figcaption className="etiqueta mt-1.5 truncate">{t.legenda}</figcaption>}
            <button onClick={() => remover(t)} aria-label="Remover"
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-surface border border-line
                               text-muted hover:text-brand opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 size={13} />
            </button>
          </figure>
        ))}
      </div>
    </section>
  )
}
