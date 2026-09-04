import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, MessageCircle, X } from 'lucide-react'
import { MARCA } from '../config/marca'
import { listarTattoos, type Tattoo } from '../lib/conteudo'

/** Galeria dos trabalhos do Vital, alimentada pelo painel dele. */
export function Tattoos() {
  const [lista, setLista] = useState<Tattoo[] | null>(null)
  const [aberta, setAberta] = useState<Tattoo | null>(null)

  useEffect(() => { listarTattoos().then(setLista).catch(() => setLista([])) }, [])

  return (
    <div className="min-h-dvh px-5 py-6 safe-top safe-bottom">
      <Link to="/inicio" className="inline-flex items-center gap-2 text-muted hover:text-ink transition-colors">
        <ArrowLeft size={18} /> Início
      </Link>

      <div className="max-w-3xl mx-auto mt-6">
        <p className="etiqueta">Feito na pele</p>
        <h1 className="font-display text-4xl mt-1.5 mb-6">Tattoos do Vital</h1>

        {!lista ? (
          <div className="grid place-items-center py-20 text-muted"><Loader2 className="animate-spin" /></div>
        ) : lista.length === 0 ? (
          <div className="moldura-sutil p-8 text-center">
            <p className="text-muted">Ainda não tem foto por aqui.</p>
            <a href={MARCA.instagram} target="_blank" rel="noreferrer" className="botao-neutro mt-5">
              Ver no Instagram
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {lista.map((t) => (
              <button key={t.id} onClick={() => setAberta(t)}
                      className="quadro !p-2 text-left transition-transform active:translate-y-[2px]">
                <img src={t.arquivo} alt={t.legenda} loading="lazy"
                     className="w-full aspect-square object-cover rounded" />
                {t.legenda && <p className="etiqueta mt-2 truncate">{t.legenda}</p>}
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 moldura p-5 text-center">
          <p className="font-display text-xl">Quer uma dessas?</p>
          <p className="text-muted text-sm mt-1.5 mb-4">
            Monte o seu bicho e mande pro Vital, ou fale direto com ele.
          </p>
          <div className="flex gap-2">
            <Link to="/montar" className="botao-neutro flex-1 !py-2.5">Montar bicho</Link>
            <a href={`https://wa.me/${MARCA.whatsapp}`} target="_blank" rel="noreferrer"
               className="botao-principal flex-1 !py-2.5">
              <MessageCircle size={18} /> Falar
            </a>
          </div>
        </div>
      </div>

      {aberta && (
        <div className="fixed inset-0 z-50 bg-ink/85 grid place-items-center p-4"
             onClick={() => setAberta(null)}>
          <button className="absolute top-5 right-5 text-canvas" aria-label="Fechar"><X /></button>
          <figure onClick={(e) => e.stopPropagation()} className="max-w-lg">
            <img src={aberta.arquivo} alt={aberta.legenda}
                 className="w-full rounded-2xl border-[2.5px] border-canvas" />
            {aberta.legenda && (
              <figcaption className="text-canvas text-center mt-3 text-sm">{aberta.legenda}</figcaption>
            )}
          </figure>
        </div>
      )}
    </div>
  )
}
