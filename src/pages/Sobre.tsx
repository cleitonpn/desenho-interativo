import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Instagram, Loader2, MessageCircle } from 'lucide-react'
import { MARCA } from '../config/marca'
import { carregarSobre, type Sobre as SobreDados } from '../lib/conteudo'

export function Sobre() {
  const [dados, setDados] = useState<SobreDados | null>(null)
  useEffect(() => { carregarSobre().then(setDados).catch(() => setDados(null)) }, [])

  return (
    <div className="min-h-dvh px-5 py-6 safe-top safe-bottom">
      <Link to="/" className="inline-flex items-center gap-2 text-muted hover:text-ink transition-colors">
        <ArrowLeft size={18} /> Voltar
      </Link>

      <div className="max-w-lg lg:max-w-4xl mx-auto mt-6">
        <p className="etiqueta">Quem desenha</p>
        <h1 className="font-display text-4xl mt-1.5 mb-6">Vital Monteiro</h1>

        {!dados ? (
          <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            {dados.fotos.length > 0 && (
              <div className={`grid gap-3 mb-7 ${
                dados.fotos.length === 1 ? '' : 'grid-cols-2 lg:grid-cols-3'}`}>
                {dados.fotos.map((foto, i) => (
                  <img key={foto} src={foto} alt="" loading={i > 1 ? 'lazy' : undefined}
                       className="w-full rounded-2xl border-[2.5px] border-ink object-cover
                                  aspect-[4/5]" />
                ))}
              </div>
            )}

            {dados.bio ? (
              <div className="space-y-4 text-muted leading-relaxed">
                {dados.bio.split('\n').filter(Boolean).map((par, i) => <p key={i}>{par}</p>)}
              </div>
            ) : (
              <p className="moldura-sutil p-5 text-muted">
                O Vital ainda não escreveu a bio dele aqui.
              </p>
            )}
          </>
        )}

        <div className="flex gap-2 mt-8">
          <a href={MARCA.instagram} target="_blank" rel="noreferrer" className="botao-neutro flex-1 !py-2.5">
            <Instagram size={18} /> Instagram
          </a>
          <a href={`https://wa.me/${MARCA.whatsapp}`} target="_blank" rel="noreferrer"
             className="botao-principal flex-1 !py-2.5">
            <MessageCircle size={18} /> Falar com ele
          </a>
        </div>
      </div>
    </div>
  )
}
