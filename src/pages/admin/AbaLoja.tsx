import { useEffect, useState } from 'react'
import { Loader2, Package, Plus, Trash2, Truck } from 'lucide-react'
import {
  CATEGORIAS_SUGERIDAS, CORES_CAMISETA, TAMANHOS, TIPOS_ROTULO, AREAS,
  formatarPreco, precisaEntrega,
  type AreaId, type CorCamiseta, type Frete, type Produto, type Tamanho, type TipoProduto,
} from '../../lib/loja'
import {
  apagarFrete, apagarProduto, categoriasEmUso, listarFretes, listarProdutos,
  salvarFrete, salvarProduto,
} from '../../lib/produtos'
import { subirFoto } from '../../lib/conteudo'

const NOVO: Omit<Produto, 'id'> = {
  nome: '', descricao: '', tipo: 'personalizavel', categoria: 'Camisetas',
  precoCentavos: 0, fotos: [], cores: ['branca', 'preta'],
  tamanhos: ['P', 'M', 'G', 'GG'], areas: ['costas', 'peito'],
  estoque: null, ativo: true, criadoEm: 0,
}

export function AbaLoja() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null)
  const [fretes, setFretes] = useState<Frete[] | null>(null)
  const [editando, setEditando] = useState<(Omit<Produto, 'id'> & { id?: string }) | null>(null)

  useEffect(() => {
    listarProdutos().then(setProdutos).catch(() => setProdutos([]))
    listarFretes().then(setFretes).catch(() => setFretes([]))
  }, [])

  async function recarregar() {
    setProdutos(await listarProdutos())
  }

  if (!produtos || !fretes) {
    return <div className="grid place-items-center py-20 text-muted"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="flex items-center gap-2 text-muted">
            <Package size={18} /> <strong className="text-ink">{produtos.length}</strong> produtos
          </p>
          <button onClick={() => setEditando({ ...NOVO, criadoEm: Date.now() })}
                  className="botao-principal !py-2 !px-4 text-sm">
            <Plus size={16} /> Novo produto
          </button>
        </div>

        {produtos.length === 0 ? (
          <p className="moldura-sutil p-8 text-center text-muted">
            Nenhum produto ainda. A loja aparece vazia para o cliente até você cadastrar o primeiro.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {produtos.map((p) => (
              <button key={p.id} onClick={() => setEditando(p)}
                      className={`quadro !p-2.5 text-left ${p.ativo ? '' : 'opacity-50'}`}>
                <div className="papel rounded aspect-square grid place-items-center overflow-hidden">
                  {p.fotos[0] ? <img src={p.fotos[0]} alt="" className="w-full h-full object-cover" />
                    : <span className="text-3xl">📦</span>}
                </div>
                <p className="font-semibold text-sm mt-2 leading-tight">{p.nome || 'Sem nome'}</p>
                <p className="etiqueta mt-1">{p.categoria}</p>
                <p className="font-display mt-1">
                  {p.precoSobConsulta ? 'Sob consulta' : formatarPreco(p.precoCentavos)}
                </p>
                {!p.ativo && <p className="etiqueta text-brand mt-1">fora do ar</p>}
              </button>
            ))}
          </div>
        )}
      </section>

      <Fretes fretes={fretes} aoMudar={setFretes} />

      {editando && (
        <Editor produto={editando} categorias={categoriasEmUso(produtos, CATEGORIAS_SUGERIDAS)}
                aoFechar={() => setEditando(null)}
                aoSalvar={async () => { setEditando(null); await recarregar() }} />
      )}
    </div>
  )
}

function Editor({ produto, categorias, aoFechar, aoSalvar }: {
  produto: Omit<Produto, 'id'> & { id?: string }
  categorias: string[]
  aoFechar: () => void
  aoSalvar: () => void
}) {
  const [p, setP] = useState(produto)
  const [preco, setPreco] = useState((produto.precoCentavos / 100).toFixed(2).replace('.', ','))
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  function mudar<K extends keyof Produto>(k: K, v: Produto[K]) {
    setP((atual) => ({ ...atual, [k]: v }))
  }

  function alternar<T>(lista: T[] | undefined, item: T): T[] {
    const atual = lista ?? []
    return atual.includes(item) ? atual.filter((x) => x !== item) : [...atual, item]
  }

  async function adicionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setOcupado(true)
    try {
      mudar('fotos', [...p.fotos, await subirFoto(arquivo, 'produtos')])
    } finally { setOcupado(false) }
  }

  async function salvar() {
    if (!p.nome.trim()) { setErro('Dê um nome ao produto.'); return }
    setOcupado(true); setErro('')
    try {
      // O preço é digitado em reais e guardado em centavos: dinheiro em número
      // quebrado acumula erro de arredondamento a cada conta.
      const centavos = Math.round(Number(preco.replace(/\./g, '').replace(',', '.')) * 100)
      await salvarProduto({ ...p, precoCentavos: Number.isFinite(centavos) ? centavos : 0 })
      aoSalvar()
    } catch {
      setErro('Não consegui salvar. Confira se sua conta está marcada como admin.')
      setOcupado(false)
    }
  }

  async function apagar() {
    if (!p.id || !confirm(`Apagar "${p.nome}"? Isso não volta atrás.`)) return
    await apagarProduto(p.id)
    aoSalvar()
  }

  const personalizavel = p.tipo === 'personalizavel'

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-3xl border-[2.5px] border-ink w-full max-w-lg my-8 animate-scale-in">
        <div className="px-5 py-4 flex items-center justify-between border-b-2 border-ink/10 sticky top-0 bg-surface rounded-t-3xl">
          <h2 className="font-display text-xl">{p.id ? 'Editar produto' : 'Novo produto'}</h2>
          <button onClick={aoFechar} className="text-muted hover:text-ink text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <span className="etiqueta">Como é vendido</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(Object.keys(TIPOS_ROTULO) as TipoProduto[]).map((t) => (
                <button key={t} onClick={() => mudar('tipo', t)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${
                    p.tipo === t ? 'border-brand bg-brand-soft' : 'border-ink/15'}`}>
                  <span className="font-semibold text-sm block">{TIPOS_ROTULO[t].rotulo}</span>
                  <span className="text-[11px] text-muted leading-tight block mt-0.5">
                    {TIPOS_ROTULO[t].ajuda}
                  </span>
                </button>
              ))}
            </div>
            {!precisaEntrega(p.tipo) && (
              <p className="text-xs text-muted mt-2">
                Acontece no estúdio, então o checkout não vai cobrar frete.
              </p>
            )}
          </div>

          <label className="block">
            <span className="etiqueta">Nome</span>
            <input className="campo mt-1" value={p.nome} onChange={(e) => mudar('nome', e.target.value)}
                   placeholder="Camiseta da galinha" />
          </label>

          <label className="block">
            <span className="etiqueta">Descrição</span>
            <textarea className="campo mt-1 resize-y" rows={3} value={p.descricao}
                      onChange={(e) => mudar('descricao', e.target.value)} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="etiqueta">Preço (R$)</span>
              <input className="campo mt-1" inputMode="decimal" value={preco}
                     onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
            </label>
            <label className="block">
              <span className="etiqueta">Categoria</span>
              <input className="campo mt-1" list="categorias" value={p.categoria}
                     onChange={(e) => mudar('categoria', e.target.value)} />
              <datalist id="categorias">
                {categorias.map((c) => <option key={c} value={c} />)}
              </datalist>
            </label>
          </div>

          {p.tipo === 'servico' && (
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" className="w-4 h-4 accent-brand"
                     checked={Boolean(p.precoSobConsulta)}
                     onChange={(e) => mudar('precoSobConsulta', e.target.checked)} />
              Preço só sob consulta (o valor acima vira ponto de partida)
            </label>
          )}

          {p.tipo === 'pronto' && (
            <label className="block">
              <span className="etiqueta">Quantidade disponível</span>
              <input className="campo mt-1" inputMode="numeric"
                     value={p.estoque ?? ''} placeholder="deixe vazio para sob demanda"
                     onChange={(e) => mudar('estoque', e.target.value ? Number(e.target.value) : null)} />
              <span className="text-xs text-muted mt-1 block">
                Cerâmica costuma ser peça única: coloque 1 e ela sai do ar quando vender.
              </span>
            </label>
          )}

          {personalizavel && (
            <>
              <Escolhas rotulo="Cores da peça" opcoes={Object.keys(CORES_CAMISETA) as CorCamiseta[]}
                        rotulos={Object.fromEntries(Object.entries(CORES_CAMISETA).map(([k, v]) => [k, v.rotulo]))}
                        ativos={p.cores ?? []} aoAlternar={(c) => mudar('cores', alternar(p.cores, c))} />
              <Escolhas rotulo="Tamanhos" opcoes={[...TAMANHOS] as Tamanho[]}
                        ativos={p.tamanhos ?? []} aoAlternar={(t) => mudar('tamanhos', alternar(p.tamanhos, t))} />
              <Escolhas rotulo="Onde a arte pode ir" opcoes={Object.keys(AREAS) as AreaId[]}
                        rotulos={Object.fromEntries(Object.entries(AREAS).map(([k, v]) => [k, `${v.rotulo} · ${v.descricao}`]))}
                        ativos={p.areas ?? []} aoAlternar={(a) => mudar('areas', alternar(p.areas, a))} />
            </>
          )}

          <div>
            <span className="etiqueta">Fotos {!personalizavel && '(obrigatórias)'}</span>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {p.fotos.map((foto) => (
                <figure key={foto} className="relative group">
                  <img src={foto} alt="" className="w-full aspect-square object-cover rounded-lg border-2 border-ink/15" />
                  <button onClick={() => mudar('fotos', p.fotos.filter((f) => f !== foto))}
                          aria-label="Remover foto"
                          className="absolute top-1 right-1 p-1 rounded bg-surface border border-line
                                     text-muted hover:text-brand opacity-0 group-hover:opacity-100">
                    <Trash2 size={11} />
                  </button>
                </figure>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-ink/25 grid
                                place-items-center cursor-pointer text-muted hover:border-brand hover:text-brand">
                <Plus size={18} />
                <input type="file" accept="image/*" className="hidden" onChange={adicionarFoto} />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm font-medium">
            <input type="checkbox" className="w-4 h-4 accent-brand" checked={p.ativo}
                   onChange={(e) => mudar('ativo', e.target.checked)} />
            Aparecendo na loja
          </label>

          {erro && <p className="text-brand text-sm font-medium">{erro}</p>}

          <div className="flex gap-2 pt-1">
            {p.id && (
              <button onClick={apagar} className="botao-neutro !px-4 !py-2.5 text-brand">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={salvar} disabled={ocupado} className="botao-principal flex-1 !py-2.5">
              {ocupado ? <Loader2 size={18} className="animate-spin" /> : null} Salvar produto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Escolhas<T extends string>({ rotulo, opcoes, ativos, aoAlternar, rotulos }: {
  rotulo: string; opcoes: T[]; ativos: T[]; aoAlternar: (v: T) => void
  rotulos?: Record<string, string>
}) {
  return (
    <div>
      <span className="etiqueta">{rotulo}</span>
      <div className="flex flex-wrap gap-2 mt-2">
        {opcoes.map((o) => (
          <button key={o} onClick={() => aoAlternar(o)}
            className={`px-3 py-1.5 rounded-full border-2 text-sm font-semibold transition-colors ${
              ativos.includes(o) ? 'border-ink bg-ink text-canvas' : 'border-ink/15 text-muted'}`}>
            {rotulos?.[o] ?? o}
          </button>
        ))}
      </div>
    </div>
  )
}

function Fretes({ fretes, aoMudar }: { fretes: Frete[]; aoMudar: (f: Frete[]) => void }) {
  const [regiao, setRegiao] = useState('')
  const [valor, setValor] = useState('')
  const [prazo, setPrazo] = useState('')

  async function adicionar() {
    if (!regiao.trim()) return
    const centavos = Math.round(Number(valor.replace(',', '.')) * 100) || 0
    await salvarFrete({ regiao: regiao.trim(), precoCentavos: centavos, prazo: prazo.trim() })
    aoMudar(await listarFretes())
    setRegiao(''); setValor(''); setPrazo('')
  }

  async function remover(id: string) {
    await apagarFrete(id)
    aoMudar(await listarFretes())
  }

  return (
    <section>
      <p className="flex items-center gap-2 text-muted mb-1">
        <Truck size={18} /> <strong className="text-ink">Frete por região</strong>
      </p>
      <p className="text-sm text-muted mb-4">
        Vale para camisetas e peças prontas. Flash e customização não cobram frete.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <input className="campo flex-1 min-w-[160px]" placeholder="Região (ex: São Paulo capital)"
               value={regiao} onChange={(e) => setRegiao(e.target.value)} />
        <input className="campo w-28" placeholder="R$ 0,00" inputMode="decimal"
               value={valor} onChange={(e) => setValor(e.target.value)} />
        <input className="campo w-32" placeholder="Prazo"
               value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        <button onClick={adicionar} className="botao-principal !py-2.5 !px-4"><Plus size={18} /></button>
      </div>

      {fretes.length === 0 ? (
        <p className="moldura-sutil p-5 text-center text-muted text-sm">
          Sem frete cadastrado, o checkout não consegue fechar pedido com entrega.
        </p>
      ) : (
        <ul className="moldura-sutil divide-y divide-line">
          {fretes.map((f) => (
            <li key={f.id} className="flex items-center justify-between px-4 py-3">
              <span>
                <strong>{f.regiao}</strong>
                {f.prazo && <span className="text-muted text-sm"> · {f.prazo}</span>}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-display">{formatarPreco(f.precoCentavos)}</span>
                <button onClick={() => remover(f.id)} className="text-faint hover:text-brand" aria-label="Remover">
                  <Trash2 size={15} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
