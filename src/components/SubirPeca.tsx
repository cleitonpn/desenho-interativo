import { useState } from 'react'
import { AlertTriangle, Loader2, Upload, X } from 'lucide-react'
import { SLOTS, caminhoDaPeca, pecaBase, personagensVisiveis } from '../lib/catalogo'
import { prepararPeca, publicarPeca, type PecaRemota } from '../lib/pecasRemotas'
import type { Catalogo, SlotId } from '../lib/tipos'

interface Props {
  catalogo: Catalogo
  aoFechar: () => void
  aoPublicar: (peca: PecaRemota) => void
}

type Medidas = Awaited<ReturnType<typeof prepararPeca>>

/**
 * Publica um acessório novo. O Vital exporta a camada do Procreate como PNG e
 * solta aqui: o recorte e a posição saem do próprio arquivo, então não há nada
 * para arrastar ou alinhar à mão.
 */
export function SubirPeca({ catalogo, aoFechar, aoPublicar }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [medidas, setMedidas] = useState<Medidas | null>(null)
  const [previa, setPrevia] = useState<string | null>(null)
  const [slot, setSlot] = useState<SlotId>('cabeca')
  // Cada personagem tem canvas próprio, então ele precisa ser escolhido antes:
  // é o que define contra qual medida o arquivo é conferido.
  const personagens = personagensVisiveis(catalogo)
  const [personagemId, setPersonagemId] = useState(personagens[0]?.id ?? 'galinha')
  const personagem = personagens.find((p) => p.id === personagemId) ?? personagens[0]
  const [rotulo, setRotulo] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const base = pecaBase(personagem)
  const quadro = personagem.enquadramento

  // O alinhamento só funciona se a camada vier do mesmo canvas das outras.
  const canvasDiferente = medidas
    && (medidas.canvasW !== personagem.canvas.w || medidas.canvasH !== personagem.canvas.h)

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setErro(''); setArquivo(f); setMedidas(null); setPrevia(null)
    if (!rotulo) setRotulo(f.name.replace(/\.png$/i, '').replace(/[-_]+/g, ' '))
    try {
      const m = await prepararPeca(f)
      setMedidas(m)
      setPrevia(URL.createObjectURL(m.blob))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui ler esse arquivo.')
    }
  }

  async function publicar() {
    if (!arquivo || !medidas || !rotulo.trim()) return
    setOcupado(true); setErro('')
    try {
      aoPublicar(await publicarPeca(personagemId, slot, rotulo.trim(), arquivo, medidas))
    } catch {
      setErro('Não consegui publicar. Confira se sua conta está marcada como admin.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl border-[2.5px] border-ink w-full max-w-lg max-h-[92dvh] overflow-y-auto animate-scale-in">
        <div className="px-5 py-4 flex items-center justify-between border-b-2 border-ink/10">
          <h2 className="font-display text-xl">Nova peça</h2>
          <button onClick={aoFechar} className="text-muted hover:text-ink" aria-label="Fechar"><X /></button>
        </div>

        <div className="p-5 space-y-4">
          {personagens.length > 1 && (
            <div>
              <span className="etiqueta">De quem é essa peça</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {personagens.map((p) => (
                  <button key={p.id} onClick={() => setPersonagemId(p.id)}
                    className={`px-3 py-1.5 rounded-full border-2 text-sm font-semibold transition-colors ${
                      personagemId === p.id ? 'border-ink bg-ink text-canvas' : 'border-ink/15 text-muted'}`}>
                    {p.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="botao-neutro w-full cursor-pointer">
            <Upload size={18} /> {arquivo ? 'Trocar arquivo' : 'Escolher PNG'}
            <input type="file" accept="image/png" className="hidden" onChange={escolher} />
          </label>

          <p className="text-xs text-muted leading-relaxed">
            Exporte do Procreate em <strong>Compartilhar camadas → Arquivos PNG</strong>,
            sem mover a camada. O canvas precisa ser o mesmo dos outros acessórios
            ({personagem.canvas.w}×{personagem.canvas.h}) — é ele que garante o encaixe.
          </p>

          {canvasDiferente && (
            <p className="flex gap-2 text-sm text-brand font-medium">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              Esse arquivo é {medidas!.canvasW}×{medidas!.canvasH}. A peça vai entrar
              fora do lugar. Reexporte no tamanho certo.
            </p>
          )}

          {previa && (
            <div>
              <p className="etiqueta mb-2">Confira o encaixe</p>
              <div className="papel moldura-sutil p-4">
                <div className="relative mx-auto max-w-[240px]"
                     style={{ aspectRatio: `${quadro.w} / ${quadro.h}` }}>
                  <img src={caminhoDaPeca(base)} alt="" className="absolute opacity-25"
                       style={{
                         left: `${((base.x - quadro.x) / quadro.w) * 100}%`,
                         top: `${((base.y - quadro.y) / quadro.h) * 100}%`,
                         width: `${(base.w / quadro.w) * 100}%`,
                       }} />
                  <img src={previa} alt="" className="absolute"
                       style={{
                         left: `${((medidas!.x - quadro.x) / quadro.w) * 100}%`,
                         top: `${((medidas!.y - quadro.y) / quadro.h) * 100}%`,
                         width: `${(medidas!.w / quadro.w) * 100}%`,
                       }} />
                </div>
              </div>
            </div>
          )}

          <label className="block">
            <span className="etiqueta">Nome que o cliente vê</span>
            <input className="campo mt-1" value={rotulo} onChange={(e) => setRotulo(e.target.value)}
                   placeholder="Chapéu de palha" />
          </label>

          <div>
            <span className="etiqueta">Onde entra</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {SLOTS.map((s) => (
                <button key={s.id} onClick={() => setSlot(s.id)}
                  className={`px-3 py-1.5 rounded-full border-2 text-sm font-semibold transition-colors ${
                    slot === s.id ? 'border-ink bg-ink text-canvas' : 'border-ink/15 text-muted'}`}>
                  {s.emoji} {s.rotulo}
                </button>
              ))}
            </div>
          </div>

          {erro && <p className="text-brand text-sm">{erro}</p>}

          <button onClick={publicar} disabled={!medidas || !rotulo.trim() || ocupado}
                  className="botao-principal w-full disabled:opacity-40">
            {ocupado ? <Loader2 size={18} className="animate-spin" /> : null} Publicar peça
          </button>
        </div>
      </div>
    </div>
  )
}
