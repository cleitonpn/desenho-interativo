import { useEffect, useState } from 'react'
import { Lightbulb, Loader2, TrendingDown, Eye } from 'lucide-react'
import {
  carregarAnalise, formatarDuracao,
  type Analise, type Confianca, type Dica, type PecaComTaxas,
} from '../../lib/analise'
import type { Catalogo } from '../../lib/tipos'

/**
 * O que a galera faz e o que isso sugere ao Vital. Todos os graficos aqui sao
 * de uma serie so — magnitude sobre um trilho neutro —, entao nao ha paleta
 * categorica: a cor da marca marca o dado e o cinza e so o trilho.
 */
export function AbaGente({ catalogo }: { catalogo: Catalogo | null }) {
  const [analise, setAnalise] = useState<Analise | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!catalogo) return
    carregarAnalise(catalogo).then(setAnalise)
      .catch((e: { code?: string }) => setErro(
        e?.code === 'permission-denied'
          ? 'As regras do Firestore ainda não liberam a leitura das métricas para o admin.'
          : `Não consegui carregar os números${e?.code ? ` (${e.code})` : ''}.`))
  }, [catalogo])

  if (erro) return <p className="moldura-sutil p-6 text-brand font-medium">{erro}</p>
  if (!analise) return <div className="grid place-items-center py-20 text-muted"><Loader2 className="animate-spin" /></div>

  const { comportamento: c, pecas, slots, ignoradas, dicas, confianca } = analise
  const totalMontagens = c.sorteios + c.escolhasManuais

  return (
    <div className="space-y-10">
      <AvisoDeConfianca confianca={confianca} sessoes={c.sessoes} />

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Numero valor={String(c.sessoes)} rotulo="visitas" />
        <Numero valor={formatarDuracao(c.medianaSegundos)} rotulo="tempo típico" />
        <Numero valor={String(c.salvamentos)} rotulo="galinhas salvas" />
        <Numero valor={String(c.levadas)} rotulo="levadas daqui" />
      </section>

      {totalMontagens > 0 && (
        <section>
          <h2 className="font-display text-xl mb-1">Como montam</h2>
          <p className="text-sm text-muted mb-4">
            Sorteio é exploração; escolher peça a peça é intenção.
          </p>
          <Proporcao parteRotulo="Sorteiam" parte={c.sorteios}
                     restoRotulo="Escolhem na mão" resto={c.escolhasManuais} />
          <div className="grid grid-cols-3 gap-3 mt-5">
            <Numero pequeno valor={String(c.provasPele)} rotulo="provas na pele" />
            <Numero pequeno valor={String(c.trocasCor)} rotulo="trocas de cor" />
            <Numero pequeno valor={String(c.limpezas)} rotulo="recomeços" />
          </div>
        </section>
      )}

      {dicas.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-1">O que desenhar agora</h2>
          <p className="text-sm text-muted mb-4">Tirado dos números, não de achismo.</p>
          <div className="space-y-3">{dicas.map((d, i) => <CartaoDica key={i} dica={d} />)}</div>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl mb-1">Apetite por categoria</h2>
        <p className="text-sm text-muted mb-4">
          Escolhas por peça — mede a procura sem premiar a categoria só por ser grande.
        </p>
        <Barras itens={slots.map((s) => ({
          chave: s.slot, rotulo: `${s.emoji} ${s.rotulo}`,
          valor: Math.round(s.apetite),
          detalhe: `${s.escolhas} escolhas · ${s.pecas} peças`,
        }))} />
      </section>

      <section>
        <h2 className="font-display text-xl mb-1">As mais vestidas</h2>
        <p className="text-sm text-muted mb-4">
          A porcentagem é quanta gente manteve a peça até salvar.
        </p>
        <Barras itens={pecas.slice(0, 12).map((p) => ({
          chave: p.peca, rotulo: p.rotulo, valor: p.escolhas,
          detalhe: p.escolhas ? `${Math.round(p.retencao * 100)}% ficam com ela` : '',
        }))} />
      </section>

      {ignoradas.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-1 flex items-center gap-2">
            <TrendingDown size={18} /> Ninguém vestiu ainda
          </h2>
          <p className="text-sm text-muted mb-4">
            {ignoradas.length} de {pecas.length} peças. Antes de concluir que não agradam,
            vale conferir se estão na categoria certa.
          </p>
          <ul className="flex flex-wrap gap-2">
            {ignoradas.map((p) => (
              <li key={p.peca} className="px-3 py-1.5 rounded-full border-2 border-ink/15 text-sm text-muted">
                {p.rotulo}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="moldura-sutil p-4">
        <p className="etiqueta flex items-center gap-1.5 mb-2"><Eye size={13} /> Sobre prints</p>
        <p className="text-sm text-muted leading-relaxed">
          Nenhum navegador avisa quando alguém tira print — não existe jeito de contar isso,
          em nenhum site. O mais perto disso é <strong className="text-ink">levadas daqui</strong>:
          quem baixou, compartilhou ou mandou no WhatsApp. Quem só printa some da conta,
          então o número real de "quis guardar" é maior que o mostrado.
        </p>
      </section>
    </div>
  )
}

/**
 * O painel liga cedo, para haver o que olhar durante os primeiros testes — mas
 * dizer em que pé está evita que uma coincidência de cinco visitas vire decisão
 * de desenho. O aviso some sozinho quando o volume o dispensa.
 */
function AvisoDeConfianca({ confianca, sessoes }: { confianca: Confianca; sessoes: number }) {
  if (confianca === 'firme') return null
  const texto: Record<Exclude<Confianca, 'firme'>, string> = {
    insuficiente: `Com ${sessoes} ${sessoes === 1 ? 'visita' : 'visitas'} ainda não dá para `
      + 'sugerir nada. Os números abaixo já contam o que aconteceu; as dicas aparecem a partir de 4.',
    testando: `${sessoes} visitas — dá para ver o app funcionando, mas trate as dicas como `
      + 'curiosidade, não como direção. Uma pessoa animada mexe o ranking inteiro nesse volume.',
    preliminar: `${sessoes} visitas. Já dá para ver tendência, mas as pontas do ranking `
      + 'ainda mudam. Vale conferir de novo antes de desenhar uma leva inteira.',
  }
  return (
    <p className="moldura-sutil p-4 text-sm text-muted leading-relaxed">
      <strong className="text-ink">
        {confianca === 'insuficiente' ? 'Ainda sem base' : confianca === 'testando' ? 'Fase de teste' : 'Tendência inicial'}.
      </strong>{' '}
      {texto[confianca]}
    </p>
  )
}

function Numero({ valor, rotulo, pequeno = false }: { valor: string; rotulo: string; pequeno?: boolean }) {
  return (
    <div className="moldura-sutil p-4">
      <p className={`font-display leading-none ${pequeno ? 'text-2xl' : 'text-3xl'}`}>{valor}</p>
      <p className="etiqueta mt-2">{rotulo}</p>
    </div>
  )
}

/** Barra de proporção entre duas partes, com os dois lados rotulados direto. */
function Proporcao({ parte, parteRotulo, resto, restoRotulo }: {
  parte: number; parteRotulo: string; resto: number; restoRotulo: string
}) {
  const total = parte + resto
  const pct = total ? (parte / total) * 100 : 0
  return (
    <div>
      <div className="flex h-7 rounded-full overflow-hidden bg-raised" role="img"
           aria-label={`${parteRotulo}: ${Math.round(pct)}%. ${restoRotulo}: ${Math.round(100 - pct)}%.`}>
        <div className="bg-brand" style={{ width: `${pct}%` }} />
        {/* 2px de superfície separam as duas partes, em vez de encostarem. */}
        <div className="w-0.5 bg-surface" />
        <div className="bg-ink/15 flex-1" />
      </div>
      <div className="flex justify-between mt-2.5 text-sm">
        <span><strong className="text-ink">{Math.round(pct)}%</strong>
          <span className="text-muted"> {parteRotulo.toLowerCase()}</span></span>
        <span><span className="text-muted">{restoRotulo.toLowerCase()} </span>
          <strong className="text-ink">{Math.round(100 - pct)}%</strong></span>
      </div>
    </div>
  )
}

interface ItemBarra { chave: string; rotulo: string; valor: number; detalhe?: string }

/** Magnitude de uma série só: a cor da marca é o dado, o trilho é neutro. */
function Barras({ itens }: { itens: ItemBarra[] }) {
  const maior = Math.max(1, ...itens.map((i) => i.valor))
  return (
    <ul className="space-y-2.5">
      {itens.map((i) => (
        <li key={i.chave} className="group" title={`${i.rotulo}: ${i.valor}`}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-sm font-medium truncate">{i.rotulo}</span>
            <span className="text-sm tabular-nums text-muted shrink-0">
              {i.detalhe && <span className="mr-2 text-faint">{i.detalhe}</span>}
              <strong className="text-ink">{i.valor}</strong>
            </span>
          </div>
          <div className="h-2 rounded-full bg-raised overflow-hidden">
            <div className="h-full rounded-full bg-brand transition-[width] duration-500"
                 style={{ width: `${(i.valor / maior) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function CartaoDica({ dica }: { dica: Dica }) {
  const cor = dica.tipo === 'fazer' ? 'border-brand bg-brand-soft'
    : dica.tipo === 'rever' ? 'border-ink/25' : 'border-ink/15'
  return (
    <article className={`rounded-2xl border-2 p-4 ${cor}`}>
      <h3 className="font-semibold flex items-center gap-2">
        {dica.tipo === 'fazer' && <Lightbulb size={16} className="text-brand shrink-0" />}
        {dica.titulo}
      </h3>
      <p className="text-sm text-muted mt-1.5 leading-relaxed">{dica.texto}</p>
    </article>
  )
}

export type { PecaComTaxas }
