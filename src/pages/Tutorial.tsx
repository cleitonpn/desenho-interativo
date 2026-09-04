import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Galinha } from '../components/Galinha'
import { carregarCatalogo } from '../lib/catalogo'
import type { Catalogo, Escolhas } from '../lib/tipos'

/** O tutorial mostra o app funcionando em vez de descrevê-lo: a cada passo a
 *  galinha do lado ganha a peça de que o texto está falando. */
const PASSOS: { titulo: string; texto: string; escolhas: Escolhas }[] = [
  {
    titulo: 'Escolha por partes',
    texto: 'O menu embaixo separa por lugar do corpo: cabeça, óculos, pescoço, roupas, meias, sapatos. Um item de cada por vez.',
    escolhas: { cabeca: 'cabeca/chapeu-cowboy' },
  },
  {
    titulo: 'Vá empilhando',
    texto: 'Cada peça entra na camada certa sozinha. Pode misturar o que quiser — bota country com tutu, se for o caso.',
    escolhas: { cabeca: 'cabeca/chapeu-cowboy', olhos: 'olhos/oculos-coracao', pescoco: 'pescoco/bandana-xadrez' },
  },
  {
    titulo: 'Sem ideia? Sorteie',
    texto: 'O botão de sorteio monta uma galinha na hora. Dá para sortear até aparecer algo que te agrade e ajustar dali.',
    escolhas: { cabeca: 'cabeca/chapeu-cowboy', olhos: 'olhos/oculos-coracao', pescoco: 'pescoco/bandana-xadrez', roupa_cima: 'roupa_cima/casaco-franjas', sapatos: 'sapatos/bota-country-cheia' },
  },
  {
    titulo: 'Salve e mande pro Vital',
    texto: 'Salve quantas quiser, troque entre vermelho e preto, veja como fica na sua pele e mande no WhatsApp dele.',
    escolhas: { cabeca: 'cabeca/chapeu-cowboy', olhos: 'olhos/oculos-coracao', pescoco: 'pescoco/bandana-xadrez', roupa_cima: 'roupa_cima/casaco-franjas', sapatos: 'sapatos/bota-country-cheia', bolsa: 'bolsa/bolsa-flor' },
  },
]

export function Tutorial() {
  const navegar = useNavigate()
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [passo, setPasso] = useState(0)

  useEffect(() => { carregarCatalogo().then(setCatalogo).catch(() => {}) }, [])

  function avancar() {
    if (passo < PASSOS.length - 1) setPasso(passo + 1)
    else { localStorage.setItem('quintal:tutorial', 'visto'); navegar('/inicio') }
  }

  const atual = PASSOS[passo]

  return (
    <div className="min-h-dvh flex flex-col px-6 py-8 safe-top safe-bottom">
      <div className="flex justify-between items-center">
        <div className="flex gap-1.5">
          {PASSOS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${
              i === passo ? 'w-7 bg-brand' : 'w-1.5 bg-line'}`} />
          ))}
        </div>
        <button onClick={() => { localStorage.setItem('quintal:tutorial', 'visto'); navegar('/inicio') }}
                className="etiqueta hover:text-ink transition-colors">Pular</button>
      </div>

      <div className="flex-1 flex items-center justify-center py-6">
        <div className="papel moldura w-full max-w-xs p-5">
          {catalogo && (
            <Galinha key={passo} catalogo={catalogo} escolhas={atual.escolhas} cor="vermelho"
                     ajustado className="w-full animate-pop" />
          )}
        </div>
      </div>

      <div className="max-w-sm mx-auto w-full text-center">
        <h2 className="font-display text-3xl">{atual.titulo}</h2>
        <p className="text-muted mt-3 leading-relaxed">{atual.texto}</p>
        <button onClick={avancar} className="botao-principal w-full mt-7">
          {passo < PASSOS.length - 1 ? 'Próximo' : 'Montar a minha'}
        </button>
      </div>
    </div>
  )
}
