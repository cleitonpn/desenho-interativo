import { useEffect, useState } from 'react'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { Download, Loader2, Share2, X } from 'lucide-react'
import { CORES, type CorId } from '../config/marca'
import { storage } from '../lib/firebase'
import { descrever } from '../lib/composicao'
import { baixarCanvas, canvasParaBlob, renderizar } from '../lib/exportar'
import { linkWhatsApp, podeCompartilharArquivo } from '../lib/whatsapp'
import { useAuth } from '../contexts/AuthContext'
import { registrarAcao, registrarConjunto } from '../lib/telemetria'
import { registrarMarco } from '../lib/progresso'
import type { Catalogo, Escolhas } from '../lib/tipos'

interface Props {
  catalogo: Catalogo
  escolhas: Escolhas
  cor: CorId
  aoFechar: () => void
}

export function EnviarWhatsApp({ catalogo, escolhas, cor, aoFechar }: Props) {
  const { usuario } = useAuth()
  const [previa, setPrevia] = useState<string | null>(null)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  const itens = descrever(catalogo, escolhas)

  useEffect(() => {
    renderizar(catalogo, escolhas, cor, { largura: 1400 })
      .then((c) => { setCanvas(c); setPrevia(c.toDataURL('image/png')) })
      .catch(() => setErro('Não consegui gerar a imagem.'))
  }, [catalogo, escolhas, cor])

  /** Sobe a imagem e abre o WhatsApp com o texto e o link já montados. */
  async function mandar() {
    if (!canvas || !usuario) return
    setOcupado(true); setErro('')
    try {
      const blob = await canvasParaBlob(canvas)
      const caminho = `criacoes/${usuario.uid}/${Date.now()}.png`
      const destino = ref(storage, caminho)
      await uploadBytes(destino, blob, { contentType: 'image/png' })
      const url = await getDownloadURL(destino)
      registrarAcao('whatsapp')
      registrarConjunto(escolhas, 'levadas')
      void registrarMarco(usuario.uid, 'enviadas')
      window.open(linkWhatsApp(itens, CORES[cor].rotulo, url), '_blank')
    } catch {
      // Se o upload falhar, ainda vale abrir a conversa só com o texto.
      setErro('Não consegui subir a imagem. Vou abrir o WhatsApp só com o texto — anexe a imagem baixada.')
      window.open(linkWhatsApp(itens, CORES[cor].rotulo), '_blank')
    } finally {
      setOcupado(false)
    }
  }

  /** No celular, o compartilhamento nativo leva a imagem de verdade junto. */
  async function compartilhar() {
    if (!canvas) return
    const blob = await canvasParaBlob(canvas)
    const arquivo = new File([blob], 'minha-galinha.png', { type: 'image/png' })
    if (!podeCompartilharArquivo(arquivo)) { baixarCanvas(canvas, 'minha-galinha.png'); return }
    try {
      await navigator.share({ files: [arquivo], text: `Minha galinha 🐔 ${itens.join(', ')}` })
      registrarAcao('compartilhamento')
      registrarConjunto(escolhas, 'levadas')
    } catch { /* cancelado pela pessoa */ }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface rounded-3xl border-[2.5px] border-ink w-full max-w-sm animate-sheet-up sm:animate-scale-in max-h-[92dvh] overflow-y-auto">
        <div className="px-5 py-4 flex items-center justify-between border-b-2 border-ink/10">
          <h2 className="font-display text-xl">Mandar pro Vital</h2>
          <button onClick={aoFechar} className="text-muted hover:text-ink" aria-label="Fechar"><X /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="papel rounded-xl border-2 border-ink/10 p-3 grid place-items-center min-h-40">
            {previa ? <img src={previa} alt="Prévia da sua galinha" className="max-h-56" />
                    : <Loader2 className="animate-spin text-muted" />}
          </div>

          <div>
            <p className="etiqueta mb-1.5">Vai junto no recado</p>
            <p className="text-sm text-muted leading-relaxed">
              {itens.length ? itens.join(', ') : 'Nenhum acessório'} · versão {CORES[cor].rotulo.toLowerCase()}
            </p>
          </div>

          {erro && <p className="text-brand text-sm">{erro}</p>}

          <div className="space-y-2 pt-1">
            <button onClick={mandar} disabled={!canvas || ocupado} className="botao-principal w-full">
              {ocupado ? <Loader2 size={18} className="animate-spin" /> : null} Abrir WhatsApp do Vital
            </button>
            <div className="flex gap-2">
              <button onClick={compartilhar} disabled={!canvas} className="botao-neutro flex-1 !py-2.5">
                <Share2 size={18} /> Compartilhar
              </button>
              <button onClick={() => {
                        if (!canvas) return
                        registrarAcao('download')
                        registrarConjunto(escolhas, 'levadas')
                        baixarCanvas(canvas, 'minha-galinha.png')
                      }}
                      disabled={!canvas} className="botao-neutro flex-1 !py-2.5">
                <Download size={18} /> Baixar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
