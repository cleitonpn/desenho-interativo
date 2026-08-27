import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { ArrowLeft, Download, Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { db } from '../../lib/firebase'
import { Galinha } from '../../components/Galinha'
import { SLOTS, carregarCatalogo, caminhoDaPeca, limparCacheDoCatalogo, pecasDoSlot } from '../../lib/catalogo'
import { removerPecaRemota, renomearPecaRemota, type PecaRemota } from '../../lib/pecasRemotas'
import { SubirPeca } from '../../components/SubirPeca'
import { CORES } from '../../config/marca'
import type { Catalogo, Criacao, Peca, Perfil } from '../../lib/tipos'

type Aba = 'mailing' | 'criacoes' | 'pecas'

/**
 * Painel do Vital. Três coisas que ele precisa ver sozinho: quem se cadastrou
 * (o mailing), o que a galera anda montando e quais peças estão no ar.
 */
export function Admin() {
  const [aba, setAba] = useState<Aba>('mailing')
  const [perfis, setPerfis] = useState<Perfil[] | null>(null)
  const [criacoes, setCriacoes] = useState<Criacao[] | null>(null)
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)

  useEffect(() => {
    carregarCatalogo().then(setCatalogo).catch(() => {})
    getDocs(query(collection(db, 'usuarios'), orderBy('criadoEm', 'desc')))
      .then((s) => setPerfis(s.docs.map((d) => ({ uid: d.id, ...d.data() } as Perfil))))
      .catch(() => setPerfis([]))
    getDocs(query(collection(db, 'criacoes'), orderBy('criadoEm', 'desc')))
      .then((s) => setCriacoes(s.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Criacao))))
      .catch(() => setCriacoes([]))
  }, [])

  return (
    <div className="min-h-dvh px-5 py-6 safe-top safe-bottom max-w-5xl mx-auto">
      <Link to="/montar" className="inline-flex items-center gap-2 text-muted hover:text-ink transition-colors">
        <ArrowLeft size={18} /> Voltar ao app
      </Link>
      <h1 className="font-display text-3xl mt-5">Painel do Vital</h1>

      <div className="flex gap-2 mt-5 mb-6 overflow-x-auto">
        {([['mailing', 'Mailing'], ['criacoes', 'Criações'], ['pecas', 'Peças']] as const).map(([id, rotulo]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`shrink-0 px-4 py-2 rounded-full border-2 font-semibold text-sm transition-colors ${
              aba === id ? 'border-ink bg-ink text-canvas' : 'border-ink/15 text-muted'}`}>
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'mailing' && <AbaMailing perfis={perfis} />}
      {aba === 'criacoes' && <AbaCriacoes criacoes={criacoes} catalogo={catalogo} />}
      {aba === 'pecas' && <AbaPecas catalogo={catalogo} aoMudar={setCatalogo} />}
    </div>
  )
}

function AbaMailing({ perfis }: { perfis: Perfil[] | null }) {
  if (!perfis) return <Carregando />

  /** Exporta em CSV para o Vital abrir no Excel ou subir numa ferramenta de e-mail. */
  function baixarCsv() {
    const cabecalho = ['Nome', 'E-mail', 'WhatsApp', 'Cidade', 'Nascimento', 'Já fez arte']
    const linhas = perfis!.map((p) => [
      p.nome, p.email, p.whatsapp, p.cidade, p.nascimento, p.jaFezArte ? 'Sim' : 'Não',
    ].map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    const blob = new Blob(['﻿' + [cabecalho.join(','), ...linhas].join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `mailing-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="flex items-center gap-2 text-muted">
          <Users size={18} /> <strong className="text-ink">{perfis.length}</strong> cadastrados
        </p>
        <button onClick={baixarCsv} disabled={!perfis.length} className="botao-neutro !py-2 !px-4 text-sm">
          <Download size={16} /> CSV
        </button>
      </div>
      <div className="moldura-sutil overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-ink/10">
            <tr className="text-left">
              {['Nome', 'E-mail', 'WhatsApp', 'Cidade', 'Nasc.', 'Cliente'].map((h) => (
                <th key={h} className="etiqueta px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perfis.map((p) => (
              <tr key={p.uid} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{p.nome}</td>
                <td className="px-4 py-3 text-muted whitespace-nowrap">{p.email}</td>
                <td className="px-4 py-3 text-muted whitespace-nowrap">{p.whatsapp}</td>
                <td className="px-4 py-3 text-muted whitespace-nowrap">{p.cidade}</td>
                <td className="px-4 py-3 text-muted whitespace-nowrap">{p.nascimento}</td>
                <td className="px-4 py-3">{p.jaFezArte ? '✅' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!perfis.length && <p className="p-8 text-center text-muted">Ninguém se cadastrou ainda.</p>}
      </div>
    </>
  )
}

function AbaCriacoes({ criacoes, catalogo }: { criacoes: Criacao[] | null; catalogo: Catalogo | null }) {
  if (!criacoes || !catalogo) return <Carregando />
  if (!criacoes.length) return <p className="moldura-sutil p-8 text-center text-muted">Nenhuma galinha montada ainda.</p>
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {criacoes.map((c) => (
        <figure key={c.id} className="quadro">
          <div className="papel rounded p-2">
            <Galinha catalogo={catalogo} escolhas={c.escolhas} cor={c.cor} ajustado className="w-full" />
          </div>
          <figcaption className="etiqueta mt-2.5 truncate">{c.autorNome}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function AbaPecas({ catalogo, aoMudar }: { catalogo: Catalogo | null; aoMudar: (c: Catalogo) => void }) {
  const [subindo, setSubindo] = useState(false)

  if (!catalogo) return <Carregando />

  /** Recarrega do zero para a peça nova já aparecer no editor e aqui. */
  async function recarregar() {
    limparCacheDoCatalogo()
    aoMudar(await carregarCatalogo())
  }

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4">
        <p className="text-muted text-sm max-w-lg">
          {catalogo.pecas.length - 1} acessórios no ar. Os marcados como
          <em> a confirmar</em> eu não consegui identificar sozinho — vale renomear.
        </p>
        <button onClick={() => setSubindo(true)} className="botao-principal !py-2 !px-4 text-sm shrink-0">
          <Plus size={16} /> Nova peça
        </button>
      </div>

      {SLOTS.map((slot) => {
        const pecas = pecasDoSlot(catalogo, slot.id)
        if (!pecas.length) return null
        return (
          <section key={slot.id}>
            <h2 className="etiqueta mb-3">{slot.emoji} {slot.rotulo} · {pecas.length}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {pecas.map((p) => <CartaoPeca key={p.id} peca={p} aoMudar={recarregar} />)}
            </div>
          </section>
        )
      })}

      {subindo && (
        <SubirPeca catalogo={catalogo} aoFechar={() => setSubindo(false)}
                   aoPublicar={async () => { setSubindo(false); await recarregar() }} />
      )}
    </div>
  )
}

/** Peças do PSD só podem ser vistas; as que vieram do painel podem ser
 *  renomeadas e apagadas, porque moram no Firestore. */
function CartaoPeca({ peca, aoMudar }: { peca: Peca; aoMudar: () => Promise<void> }) {
  const remota = 'caminhoStorage' in peca ? (peca as PecaRemota) : null
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(peca.rotulo ?? '')

  async function salvar() {
    if (!remota || !nome.trim()) return
    await renomearPecaRemota(remota, nome.trim())
    setEditando(false)
    await aoMudar()
  }

  async function apagar() {
    if (!remota) return
    if (!confirm(`Apagar "${peca.rotulo}"? Isso não volta atrás.`)) return
    await removerPecaRemota(remota)
    await aoMudar()
  }

  return (
    <figure className="moldura-sutil p-2 relative group">
      <div className="h-16 grid place-items-center">
        <img src={caminhoDaPeca(peca)} alt="" className="max-h-16 max-w-full object-contain"
             style={{ filter: CORES.vermelho.filtro }} />
      </div>
      {editando ? (
        <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)}
               onBlur={salvar} onKeyDown={(e) => e.key === 'Enter' && salvar()}
               className="w-full text-[10px] text-center border-b-2 border-brand bg-transparent mt-1.5 outline-none" />
      ) : (
        <figcaption className="text-[10px] text-center text-muted mt-1.5 leading-tight">
          {peca.rotulo}
          <span className="block text-faint mt-0.5">{peca.origem.replace('.png', '')}</span>
        </figcaption>
      )}
      {remota && !editando && (
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditando(true)} className="p-1 rounded bg-surface border border-line text-muted hover:text-ink" aria-label="Renomear">
            <Pencil size={11} />
          </button>
          <button onClick={apagar} className="p-1 rounded bg-surface border border-line text-muted hover:text-brand" aria-label="Apagar">
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </figure>
  )
}

function Carregando() {
  return <div className="grid place-items-center py-20 text-muted"><Loader2 className="animate-spin" /></div>
}
