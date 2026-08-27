import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Instagram, Sparkles } from 'lucide-react'
import { MARCA } from '../config/marca'
import { Galinha } from '../components/Galinha'
import { carregarCatalogo } from '../lib/catalogo'
import { ouvirVitrine } from '../lib/criacoes'
import { EXEMPLOS } from '../lib/exemplos'
import type { Catalogo, Criacao } from '../lib/tipos'

/**
 * Porta de entrada, antes do login. O objetivo é mostrar o que o app faz sem
 * parecer anúncio: quem chega vê galinhas de gente de verdade passando na tela.
 */
export function Abertura() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [vitrine, setVitrine] = useState<Criacao[]>(EXEMPLOS)

  useEffect(() => {
    carregarCatalogo().then(setCatalogo).catch(() => {})
    return ouvirVitrine(12, (lista) => setVitrine(lista.length >= 4 ? lista : EXEMPLOS))
  }, [])

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="safe-top px-6 pt-6 flex items-center justify-between">
        <span className="font-display text-xl tracking-tight">{MARCA.nome}</span>
        <a href={MARCA.instagram} target="_blank" rel="noreferrer"
           className="text-muted hover:text-brand transition-colors" aria-label="Instagram do Vital">
          <Instagram size={20} />
        </a>
      </header>

      <main className="flex-1 px-6 flex flex-col items-center justify-center text-center py-10">
        <p className="etiqueta mb-4">{MARCA.chamada}</p>
        <h1 className="font-display text-[13vw] leading-[0.85] sm:text-7xl max-w-3xl">
          Monte sua <span className="text-brand">galinha</span>
        </h1>
        <p className="mt-6 max-w-md text-muted leading-relaxed">
          Mais de 90 acessórios desenhados à mão pelo Vital. Escolha o chapéu, o
          óculos, a bota — e leve o desenho pronto para tatuar.
        </p>
        <Link to="/entrar" className="botao-principal mt-8 text-lg px-8">
          <Sparkles size={20} /> Começar
        </Link>
      </main>

      {catalogo && <FaixaVitrine catalogo={catalogo} criacoes={vitrine} />}
    </div>
  )
}

/** Esteira infinita de criações, no espírito de uma parede de quadros. */
function FaixaVitrine({ catalogo, criacoes }: { catalogo: Catalogo; criacoes: Criacao[] }) {
  const fila = [...criacoes, ...criacoes]
  return (
    <section className="pb-10 overflow-hidden safe-bottom">
      <p className="etiqueta text-center mb-4">Feitas aqui dentro</p>
      <div className="flex gap-5 w-max animate-deslizar hover:[animation-play-state:paused]">
        {fila.map((c, i) => (
          <figure key={`${c.id}-${i}`} className="quadro w-40 shrink-0">
            <div className="papel rounded flex items-center justify-center p-2">
              <Galinha catalogo={catalogo} escolhas={c.escolhas} cor={c.cor} ajustado className="w-full" />
            </div>
            <figcaption className="etiqueta mt-2.5 text-center truncate">{c.autorNome}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
