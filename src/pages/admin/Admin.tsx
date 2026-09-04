import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { ArrowLeft, Download, EyeOff, Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { db } from '../../lib/firebase'
import { Galinha } from '../../components/Galinha'
import { SLOTS, carregarCatalogo, caminhoDaPeca, limparCacheDoCatalogo } from '../../lib/catalogo'
import { ajustarPeca, removerPecaRemota, type PecaRemota } from '../../lib/pecasRemotas'
import { SubirPeca } from '../../components/SubirPeca'
import { AbaGente } from './AbaGente'
import { AbaEstudio } from './AbaEstudio'
import { CORES } from '../../config/marca'
import type { Catalogo, Criacao, Peca, Perfil, SlotId } from '../../lib/tipos'

type Aba = 'gente' | 'estudio' | 'mailing' | 'criacoes' | 'pecas'

/**
 * Painel do Vital. Três coisas que ele precisa ver sozinho: quem se cadastrou
 * (o mailing), o que a galera anda montando e quais peças estão no ar.
 */
export function Admin() {
  const [aba, setAba] = useState<Aba>('gente')
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
        {([['gente', 'A galera'], ['estudio', 'Estúdio'], ['mailing', 'Mailing'],
           ['criacoes', 'Criações'], ['pecas', 'Peças']] as const).map(([id, rotulo]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`shrink-0 px-4 py-2 rounded-full border-2 font-semibold text-sm transition-colors ${
              aba === id ? 'border-ink bg-ink text-canvas' : 'border-ink/15 text-muted'}`}>
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'gente' && <AbaGente catalogo={catalogo} />}
      {aba === 'estudio' && <AbaEstudio />}
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
    const cabecalho = ['Nome', 'E-mail', 'E-mail confirmado', 'WhatsApp', 'Cidade',
                       'Nascimento', 'Já fez arte']
    const linhas = perfis!.map((p) => [
      p.nome, p.email, p.emailVerificado ? 'Sim' : 'Não',
      p.whatsapp, p.cidade, p.nascimento, p.jaFezArte ? 'Sim' : 'Não',
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
              {['Nome', 'E-mail', 'OK', 'WhatsApp', 'Cidade', 'Nasc.', 'Cliente'].map((h) => (
                <th key={h} className="etiqueta px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perfis.map((p) => (
              <tr key={p.uid} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{p.nome}</td>
                <td className="px-4 py-3 text-muted whitespace-nowrap">{p.email}</td>
                <td className="px-4 py-3" title={p.emailVerificado ? 'E-mail confirmado' : 'Ainda não confirmou'}>
                  {p.emailVerificado ? '✅' : '⚠️'}
                </td>
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
        const pecas = catalogo.pecas.filter((p) => p.slot === slot.id)
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

/**
 * Cada peça pode ter nome e categoria corrigidos — inclusive as que vieram do
 * PSD, cuja classificação foi feita no olho e pode estar errada. O ajuste vira
 * um registro no Firestore que se sobrepõe ao catálogo estático, então nada
 * disso precisa de deploy.
 */
function CartaoPeca({ peca, aoMudar }: { peca: Peca; aoMudar: () => Promise<void> }) {
  const remota = 'caminhoStorage' in peca ? (peca as PecaRemota) : null
  const [abrindo, setAbrindo] = useState(false)
  const [nome, setNome] = useState(peca.rotulo ?? '')
  const [salvando, setSalvando] = useState(false)

  async function aplicar(mudancas: { slot?: SlotId; rotulo?: string; oculta?: boolean }) {
    setSalvando(true)
    try {
      await ajustarPeca(peca, mudancas)
      await aoMudar()
      setAbrindo(false)
    } finally {
      setSalvando(false)
    }
  }

  async function apagar() {
    if (!remota) return
    if (!confirm(`Apagar "${peca.rotulo}"? Isso não volta atrás.`)) return
    await removerPecaRemota(remota)
    await aoMudar()
  }

  return (
    <figure className={`moldura-sutil p-2 relative group ${peca.oculta ? 'opacity-40' : ''}`}>
      {peca.oculta && (
        <span className="absolute top-1 left-1 etiqueta !text-[8px] bg-ink text-canvas px-1.5 py-0.5 rounded">
          fora do ar
        </span>
      )}
      <div className="h-16 grid place-items-center">
        <img src={caminhoDaPeca(peca)} alt="" className="max-h-16 max-w-full object-contain miniatura-peca"
             style={{ filter: CORES.vermelho.filtro }} />
      </div>
      <figcaption className="text-[10px] text-center text-muted mt-1.5 leading-tight">
        {peca.rotulo}
        <span className="block text-faint mt-0.5">{peca.origem.replace('.png', '')}</span>
      </figcaption>

      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100
                      focus-within:opacity-100 transition-opacity">
        <button onClick={() => setAbrindo(true)}
                className="p-1 rounded bg-surface border border-line text-muted hover:text-ink"
                aria-label={`Ajustar ${peca.rotulo}`}>
          <Pencil size={11} />
        </button>
        {remota && (
          <button onClick={apagar}
                  className="p-1 rounded bg-surface border border-line text-muted hover:text-brand"
                  aria-label={`Apagar ${peca.rotulo}`}>
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {abrindo && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4"
             onClick={() => !salvando && setAbrindo(false)}>
          <div className="bg-surface rounded-2xl border-[2.5px] border-ink w-full max-w-sm p-5
                          space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <img src={caminhoDaPeca(peca)} alt="" className="h-14 w-14 object-contain miniatura-peca" />
              <div className="min-w-0">
                <p className="font-display text-lg leading-tight">{peca.rotulo}</p>
                <p className="etiqueta truncate">{peca.origem.replace('.png', '')}</p>
              </div>
            </div>

            <label className="block">
              <span className="etiqueta">Nome que o cliente vê</span>
              <input autoFocus className="campo mt-1" value={nome}
                     onChange={(e) => setNome(e.target.value)} />
            </label>

            <div>
              <span className="etiqueta">Categoria</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SLOTS.map((s) => (
                  <button key={s.id} onClick={() => aplicar({ slot: s.id, rotulo: nome.trim() || peca.rotulo })}
                    disabled={salvando}
                    className={`px-2.5 py-1.5 rounded-full border-2 text-xs font-semibold transition-colors ${
                      peca.slot === s.id ? 'border-ink bg-ink text-canvas' : 'border-ink/15 text-muted hover:border-ink/40'}`}>
                    {s.emoji} {s.rotulo}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">
                Tocar numa categoria move a peça e salva na hora.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => aplicar({ oculta: !peca.oculta })} disabled={salvando}
                      className="botao-neutro flex-1 !py-2.5 text-sm">
                <EyeOff size={16} /> {peca.oculta ? 'Mostrar' : 'Esconder'}
              </button>
              <button onClick={() => aplicar({ rotulo: nome.trim() || peca.rotulo })}
                      disabled={salvando || !nome.trim()} className="botao-principal flex-1 !py-2.5 text-sm">
                {salvando ? <Loader2 size={16} className="animate-spin" /> : null} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </figure>
  )
}

function Carregando() {
  return <div className="grid place-items-center py-20 text-muted"><Loader2 className="animate-spin" /></div>
}
