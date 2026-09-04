import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { formatarPreco, TIPOS_ROTULO, type Produto } from '../lib/loja'

export function Loja() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null)

  useEffect(() => {
    getDocs(query(collection(db, 'produtos'), where('ativo', '==', true)))
      .then((s) => setProdutos(s.docs.map((d) => ({ id: d.id, ...d.data() } as Produto))))
      .catch(() => setProdutos([]))
  }, [])

  const categorias = [...new Set((produtos ?? []).map((p) => p.categoria))].sort()

  return (
    <div className="min-h-dvh px-5 py-6 safe-top safe-bottom">
      <Link to="/inicio" className="inline-flex items-center gap-2 text-muted hover:text-ink transition-colors">
        <ArrowLeft size={18} /> Início
      </Link>

      <div className="max-w-3xl mx-auto mt-6">
        <p className="etiqueta">Do estúdio para você</p>
        <h1 className="font-display text-4xl mt-1.5 mb-6">Loja</h1>

        {!produtos ? (
          <div className="grid place-items-center py-20 text-muted"><Loader2 className="animate-spin" /></div>
        ) : produtos.length === 0 ? (
          <div className="moldura-sutil p-8 text-center">
            <p className="text-muted">A loja ainda está sendo montada.</p>
            <Link to="/montar" className="botao-principal mt-5">Enquanto isso, monte uma galinha</Link>
          </div>
        ) : (
          categorias.map((cat) => (
            <section key={cat} className="mb-9">
              <h2 className="etiqueta mb-3">{cat}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {produtos.filter((p) => p.categoria === cat).map((p) => (
                  <Link key={p.id} to={`/loja/${p.id}`} className="quadro !p-2.5 transition-transform active:translate-y-[2px]">
                    <div className="papel rounded aspect-square grid place-items-center overflow-hidden">
                      {p.fotos[0]
                        ? <img src={p.fotos[0]} alt={p.nome} loading="lazy" className="w-full h-full object-cover" />
                        : <span className="text-4xl">🐔</span>}
                    </div>
                    <p className="font-semibold text-sm mt-2.5 leading-tight">{p.nome}</p>
                    <p className="etiqueta mt-1">{TIPOS_ROTULO[p.tipo].rotulo}</p>
                    <p className="font-display text-lg mt-1">
                      {p.precoSobConsulta ? 'Sob consulta' : formatarPreco(p.precoCentavos)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
