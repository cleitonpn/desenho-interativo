import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Images, Palette, ShoppingBag, Sparkle, UserRound } from 'lucide-react'
import { MARCA } from '../config/marca'
import { Desenho } from '../components/Desenho'
import { useAuth } from '../contexts/AuthContext'
import { carregarCatalogo, personagemPadrao, personagensVisiveis } from '../lib/catalogo'
import {
  carregarProgresso, conquistasVisiveis, desenhoDoDia, totalDePecas,
  VAZIO, type Progresso,
} from '../lib/progresso'
import type { Catalogo } from '../lib/tipos'

/**
 * O hub do app. Antes, entrar caía direto no editor — o que servia para montar
 * um desenho e mais nada. Aqui a pessoa vê onde pode ir, o quanto já explorou
 * do acervo do Vital e um desenho novo por dia.
 */
export function Inicio() {
  const { perfil } = useAuth()
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [progresso, setProgresso] = useState<Progresso>(VAZIO)

  useEffect(() => {
    carregarCatalogo().then(setCatalogo).catch(() => {})
  }, [])
  useEffect(() => {
    if (perfil?.uid) carregarProgresso(perfil.uid).then(setProgresso).catch(() => {})
  }, [perfil?.uid])

  const bichos = catalogo ? personagensVisiveis(catalogo) : []
  const totais = { pecas: totalDePecas(bichos), personagens: bichos.length }
  const total = totais.pecas
  const vistas = progresso.descobertas.length
  // O desenho do dia sorteia também o bicho, para a home não ser sempre galinha.
  const doDia = useMemo(() => {
    if (!catalogo) return null
    const visiveis = personagensVisiveis(catalogo)
    const dia = new Date().getDate()
    const personagem = visiveis[dia % visiveis.length] ?? personagemPadrao(catalogo)
    return { personagem, escolhas: desenhoDoDia(personagem) }
  }, [catalogo])

  return (
    <div className="min-h-dvh safe-top safe-bottom">
      <header className="px-5 pt-5 flex items-center justify-between">
        <span className="font-display text-lg">{MARCA.nome}</span>
        <Link to="/conta" className="botao-neutro !px-3 !py-2" aria-label="Minha conta">
          <UserRound size={18} />
        </Link>
      </header>

      <main className="px-5 pb-10 max-w-lg mx-auto">
        <p className="etiqueta mt-6">Oi, {perfil?.nome?.split(' ')[0] ?? 'tudo bem'}</p>
        <h1 className="font-display text-4xl leading-[0.95] mt-1.5">
          O que vamos<br />fazer hoje?
        </h1>

        {/* A descoberta vem antes dos atalhos: é o que dá tamanho ao acervo do
            Vital e transforma "mais 99 desenhos" em algo para explorar. */}
        {total > 0 && (
          <section className="moldura mt-6 p-5">
            <div className="flex items-baseline justify-between mb-2.5">
              <p className="etiqueta">Acessórios que você já provou</p>
              <p className="font-display text-lg tabular-nums">
                {vistas}<span className="text-faint">/{total}</span>
              </p>
            </div>
            <div className="h-2.5 rounded-full bg-raised overflow-hidden">
              <div className="h-full rounded-full bg-brand transition-[width] duration-700"
                   style={{ width: `${Math.max((vistas / total) * 100, vistas ? 3 : 0)}%` }} />
            </div>
            <p className="text-sm text-muted mt-3 leading-relaxed">
              {vistas === 0 ? 'O Vital desenhou todos eles à mão, um por um. Bora ver?'
                : vistas >= total ? 'Você viu todos. Sério.'
                : `Faltam ${total - vistas} para você ter visto tudo que o Vital desenhou.`}
            </p>
          </section>
        )}

        <nav className="grid grid-cols-2 gap-3 mt-4">
          <Atalho para="/montar" cor="brand" icone={<Palette size={22} />}
                  titulo="Montar" texto="Escolha o bicho e os acessórios" grande />
          <Atalho para="/loja" icone={<ShoppingBag size={20} />}
                  titulo="Loja" texto="Camisetas e cerâmicas" />
          <Atalho para="/tattoos" icone={<Flame size={20} />}
                  titulo="Tattoos" texto="Trabalhos do Vital" />
          <Atalho para="/minhas" icone={<Images size={20} />}
                  titulo="Minhas criações" texto="O que você já salvou" />
          <Atalho para="/sobre" icone={<UserRound size={20} />}
                  titulo="Quem é o Vital" texto="A história do traço" />
        </nav>

        {catalogo && doDia && (
          <section className="mt-4 moldura p-5">
            <p className="etiqueta flex items-center gap-1.5">
              <Sparkle size={13} className="text-brand" /> {doDia.personagem.nome} de hoje
            </p>
            <div className="papel rounded-xl border-2 border-ink/10 mt-3 p-3 grid place-items-center">
              <Desenho personagem={doDia.personagem} escolhas={doDia.escolhas} cor="vermelho"
                       ajustado className="w-40" />
            </div>
            {/* Sem adjetivo concordando com o nome do bicho: "galinha sorteado"
                e "gato sorteada" sairiam errados na mesma frase. */}
            <p className="text-sm text-muted mt-3 leading-relaxed">
              Sorteio de hoje, igual para todo mundo. Amanhã muda.
            </p>
            <Link to="/montar" state={{ escolhas: doDia.escolhas, personagem: doDia.personagem.id }}
                  className="botao-neutro w-full mt-3 !py-2.5">
              Abrir essa no editor
            </Link>
          </section>
        )}

        <section className="mt-8">
          <h2 className="etiqueta mb-3">Conquistas</h2>
          <div className="grid grid-cols-3 gap-3">
            {conquistasVisiveis(totais).map((c) => {
              const pct = Math.min(c.progresso(progresso, { ...totais, pecas: total || 1 }), 1)
              const feita = pct >= 1
              return (
                <article key={c.id} title={c.descricao}
                  className={`rounded-2xl border-2 p-3 text-center transition-colors ${
                    feita ? 'border-brand bg-brand-soft' : 'border-ink/10'}`}>
                  <span className={`text-2xl block ${feita ? '' : 'grayscale opacity-35'}`}>
                    {c.emoji}
                  </span>
                  <p className="text-[11px] font-semibold leading-tight mt-1.5">{c.titulo}</p>
                  {!feita && pct > 0 && (
                    <div className="h-1 rounded-full bg-raised overflow-hidden mt-2">
                      <div className="h-full bg-brand/50" style={{ width: `${pct * 100}%` }} />
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

function Atalho({ para, titulo, texto, icone, cor, grande = false }: {
  para: string; titulo: string; texto: string
  icone: React.ReactNode; cor?: 'brand'; grande?: boolean
}) {
  const destaque = cor === 'brand'
  return (
    <Link to={para}
      className={`moldura p-4 flex flex-col justify-between transition-transform
                  active:translate-y-[2px] ${grande ? 'col-span-2 min-h-[124px]' : 'min-h-[104px]'}
                  ${destaque ? '!bg-brand !text-white' : ''}`}>
      <span className={destaque ? 'text-white' : 'text-brand'}>{icone}</span>
      <span>
        <span className="font-display block text-lg leading-tight mt-2">{titulo}</span>
        <span className={`text-xs block mt-0.5 ${destaque ? 'text-white/80' : 'text-muted'}`}>
          {texto}
        </span>
      </span>
    </Link>
  )
}
