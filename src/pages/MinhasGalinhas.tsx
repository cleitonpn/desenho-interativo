import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Trash2, UserRound } from 'lucide-react'
import { Galinha } from '../components/Galinha'
import { carregarCatalogo } from '../lib/catalogo'
import { apagarCriacao, minhasCriacoes } from '../lib/criacoes'
import { useAuth } from '../contexts/AuthContext'
import type { Catalogo, Criacao } from '../lib/tipos'

export function MinhasGalinhas() {
  const { usuario } = useAuth()
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [lista, setLista] = useState<Criacao[] | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregarCatalogo().then(setCatalogo).catch(() => {})
    if (usuario) {
      minhasCriacoes(usuario.uid).then(setLista).catch((e: { code?: string }) => {
        // Fingir "nenhuma galinha" quando a consulta falha esconde o problema
        // e faz parecer que o salvamento nao funcionou.
        setErro(e?.code === 'permission-denied'
          ? 'As regras do Firestore estão bloqueando a leitura das suas criações.'
          : `Não consegui carregar suas galinhas${e?.code ? ` (${e.code})` : ''}.`)
        setLista([])
      })
    } else {
      // Sem usuario nao ha o que buscar: sem isso a tela gira para sempre.
      setLista([])
    }
  }, [usuario])

  async function apagar(id: string) {
    await apagarCriacao(id)
    setLista((l) => l?.filter((c) => c.id !== id) ?? null)
  }

  return (
    <div className="min-h-dvh px-5 py-6 safe-top safe-bottom">
      <div className="flex items-center justify-between">
        <Link to="/montar" className="inline-flex items-center gap-2 text-muted hover:text-ink transition-colors">
          <ArrowLeft size={18} /> Montar
        </Link>
        <Link to="/conta" className="text-muted hover:text-ink transition-colors" aria-label="Minha conta">
          <UserRound size={20} />
        </Link>
      </div>
      <h1 className="font-display text-3xl mt-5 mb-6">Minhas galinhas</h1>

      {!catalogo || lista === null ? (
        <div className="grid place-items-center py-20 text-muted"><Loader2 className="animate-spin" /></div>
      ) : erro ? (
        <div className="moldura-sutil p-6 text-center">
          <p className="text-brand font-medium">{erro}</p>
          <p className="text-muted text-sm mt-2">
            Suas galinhas continuam salvas — o problema é só para exibi-las aqui.
          </p>
        </div>
      ) : lista.length === 0 ? (
        <div className="moldura-sutil p-8 text-center">
          <p className="text-muted">Você ainda não salvou nenhuma.</p>
          <Link to="/montar" className="botao-principal mt-5">Montar a primeira</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {lista.map((c) => (
            <figure key={c.id} className="quadro">
              <div className="papel rounded p-2">
                <Galinha catalogo={catalogo} escolhas={c.escolhas} cor={c.cor} ajustado className="w-full" />
              </div>
              <figcaption className="flex items-center justify-between mt-2.5">
                <span className="etiqueta">
                  {new Date(c.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
                <button onClick={() => apagar(c.id)} className="text-faint hover:text-brand transition-colors"
                        aria-label="Apagar">
                  <Trash2 size={15} />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
