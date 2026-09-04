import { useEffect, useRef, useState } from 'react'
import { Camera, Download, Loader2, RotateCw, X } from 'lucide-react'
import type { CorId } from '../config/marca'
import { renderizar } from '../lib/exportar'
import type { Escolhas, Personagem } from '../lib/tipos'

interface Props {
  personagem: Personagem
  escolhas: Escolhas
  cor: CorId
  aoFechar: () => void
}

interface Transformacao { x: number; y: number; escala: number; giro: number }

/**
 * Prova da tatuagem sobre uma foto. O encaixe é feito pela pessoa, com os
 * dedos — mais confiável que adivinhar onde está o braço. O desenho entra em
 * `multiply` e com um pouco de transparência, que é o que faz o traço parecer
 * pigmento na pele em vez de adesivo colado por cima.
 */
export function ProvaNaPele({ personagem, escolhas, cor, aoFechar }: Props) {
  const [foto, setFoto] = useState<string | null>(null)
  const [desenho, setDesenho] = useState<string | null>(null)
  const [t, setT] = useState<Transformacao>({ x: 50, y: 50, escala: 40, giro: 0 })
  const [ocupado, setOcupado] = useState(false)
  const areaRef = useRef<HTMLDivElement>(null)
  const gesto = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)

  useEffect(() => {
    renderizar(personagem, escolhas, cor, { largura: 900, semAssinatura: true, transparente: true })
      .then((c) => setDesenho(c.toDataURL('image/png')))
      .catch(() => {})
  }, [personagem, escolhas, cor])

  function abrirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (arquivo) setFoto(URL.createObjectURL(arquivo))
  }

  function iniciar(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    gesto.current = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y }
  }

  function mover(e: React.PointerEvent) {
    const g = gesto.current
    const area = areaRef.current
    if (!g || !area) return
    const r = area.getBoundingClientRect()
    setT((v) => ({
      ...v,
      x: g.tx + ((e.clientX - g.x) / r.width) * 100,
      y: g.ty + ((e.clientY - g.y) / r.height) * 100,
    }))
  }

  async function baixar() {
    if (!foto || !desenho || !areaRef.current) return
    setOcupado(true)
    try {
      const base = await carregar(foto)
      const arte = await carregar(desenho)
      const canvas = document.createElement('canvas')
      canvas.width = base.naturalWidth
      canvas.height = base.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(base, 0, 0)

      // A área de preview e a foto têm proporções diferentes; a conversão usa
      // a mesma regra de porcentagem que posiciona o desenho na tela.
      const larguraArte = (t.escala / 100) * canvas.width
      const alturaArte = larguraArte * (arte.naturalHeight / arte.naturalWidth)
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      ctx.globalAlpha = 0.9
      ctx.translate((t.x / 100) * canvas.width, (t.y / 100) * canvas.height)
      ctx.rotate((t.giro * Math.PI) / 180)
      ctx.drawImage(arte, -larguraArte / 2, -alturaArte / 2, larguraArte, alturaArte)
      ctx.restore()

      const link = document.createElement('a')
      link.download = 'galinha-na-pele.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-canvas flex flex-col safe-top safe-bottom">
      <header className="px-5 py-4 flex items-center justify-between border-b-2 border-ink/10">
        <h2 className="font-display text-xl">Na pele</h2>
        <button onClick={aoFechar} className="text-muted hover:text-ink" aria-label="Fechar"><X /></button>
      </header>

      {!foto ? (
        <div className="flex-1 grid place-items-center px-8 text-center">
          <div>
            <p className="text-muted mb-6 leading-relaxed">
              Tire uma foto do braço, da perna — de onde a tatuagem vai ficar — e
              posicione o desenho com o dedo.
            </p>
            <label className="botao-principal cursor-pointer">
              <Camera size={20} /> Escolher foto
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={abrirFoto} />
            </label>
          </div>
        </div>
      ) : (
        <>
          <div ref={areaRef} className="flex-1 relative overflow-hidden bg-ink/5 touch-none"
               onPointerDown={iniciar} onPointerMove={mover} onPointerUp={() => (gesto.current = null)}>
            <img src={foto} alt="" className="absolute inset-0 w-full h-full object-contain" />
            {desenho && (
              <img src={desenho} alt="" draggable={false}
                className="absolute pointer-events-none select-none"
                style={{
                  left: `${t.x}%`, top: `${t.y}%`, width: `${t.escala}%`,
                  transform: `translate(-50%, -50%) rotate(${t.giro}deg)`,
                  mixBlendMode: 'multiply', opacity: 0.9,
                }} />
            )}
          </div>

          <div className="px-5 py-4 space-y-3 border-t-2 border-ink/10">
            <label className="block">
              <span className="etiqueta">Tamanho</span>
              <input type="range" min={10} max={95} value={t.escala} className="w-full accent-brand"
                     onChange={(e) => setT((v) => ({ ...v, escala: Number(e.target.value) }))} />
            </label>
            <label className="block">
              <span className="etiqueta flex items-center gap-1"><RotateCw size={12} /> Giro</span>
              <input type="range" min={-180} max={180} value={t.giro} className="w-full accent-brand"
                     onChange={(e) => setT((v) => ({ ...v, giro: Number(e.target.value) }))} />
            </label>
            <div className="flex gap-2">
              <label className="botao-neutro flex-1 cursor-pointer !py-2.5">
                <Camera size={18} /> Outra foto
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={abrirFoto} />
              </label>
              <button onClick={baixar} disabled={ocupado} className="botao-principal flex-1 !py-2.5">
                {ocupado ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Salvar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não consegui abrir a imagem.'))
    img.src = src
  })
}
