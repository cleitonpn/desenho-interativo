import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Flame, Images, Instagram, Palette, ShoppingBag, Sparkle, UserRound,
} from 'lucide-react'
import { MARCA } from '../config/marca'
import { Desenho } from '../components/Desenho'
import { useAuth } from '../contexts/AuthContext'
import { acharPersonagem, carregarCatalogo, personagemPadrao, personagensVisiveis } from '../lib/catalogo'
import { ouvirVitrine } from '../lib/criacoes'
import { EXEMPLOS } from '../lib/exemplos'
import {
  carregarProgresso, conquistasVisiveis, desenhoDoDia, totalDePecas,
  VAZIO, type Progresso,
} from '../lib/progresso'
import type { Catalogo, Criacao } from '../lib/tipos'

/**
 * A porta de entrada, publica.
 *
 * Antes eram duas telas: uma vitrine para visitantes e um hub para quem tinha
 * entrado. Isso punha a loja, as tattoos e a bio atras do login, o que e o
 * contrario do que uma loja faz — ninguem cria conta para so entao descobrir
 * se ha algo que preste. Agora e uma tela so: todo mundo ve tudo, e o que
 * depende de ser voce (progresso, conquistas, suas criacoes) aparece quando
 * voce entra.
 */
export function Home() {
  const { usuario, perfil } = useAuth()
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [vitrine, setVitrine] = useState<Criacao[]>(EXEMPLOS)
  const [progresso, setProgresso] = useState<Progresso>(VAZIO)

  useEffect(() => {
    carregarCatalogo().then(setCatalogo).catch(() => {})
    return ouvirVitrine(12, (lista) => setVitrine(lista.length >= 4 ? lista : EXEMPLOS))
  }, [])
  useEffect(() => {
    if (usuario?.uid) carregarProgresso(usuario.uid).then(setProgresso).catch(() => {})
  }, [usuario?.uid])

  const bichos = catalogo ? personagensVisiveis(catalogo) : []
  const totais = { pecas: totalDePecas(bichos), personagens: bichos.length }
  const vistas = progresso.descobertas.length

  const doDia = useMemo(() => {
    if (!catalogo) return null
    const visiveis = personagensVisiveis(catalogo)
    const personagem = visiveis[new Date().getDate() % visiveis.length] ?? personagemPadrao(catalogo)
    return { personagem, escolhas: desenhoDoDia(personagem) }
  }, [catalogo])

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="safe-top px-5 lg:px-10 pt-5 flex items-center justify-between">
        <span className="font-display text-xl tracking-tight">{MARCA.nome}</span>
        <div className="flex items-center gap-2">
          <a href={MARCA.instagram} target="_blank" rel="noreferrer"
             className="text-muted hover:text-brand transition-colors p-2" aria-label="Instagram do Vital">
            <Instagram size={20} />
          </a>
          {usuario ? (
            <Link to="/conta" className="botao-neutro !px-3 !py-2" aria-label="Minha conta">
              <UserRound size={18} />
            </Link>
          ) : (
            <Link to="/entrar" className="botao-neutro !px-4 !py-2 text-sm">Entrar</Link>
          )}
        </div>
      </header>

      {/* No celular tudo empilha; no desktop a coluna estreita deixaria dois
          terços da tela vazios, então o conteúdo se espalha em três colunas. */}
      <main className="px-5 lg:px-10 pb-10 w-full max-w-lg lg:max-w-6xl mx-auto">
        {usuario ? (
          <>
            <p className="etiqueta mt-6">Oi, {perfil?.nome?.split(' ')[0] ?? 'tudo bem'}</p>
            <h1 className="font-display text-4xl leading-[0.95] mt-1.5">
              O que vamos<br />fazer hoje?
            </h1>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="etiqueta">{MARCA.chamada}</p>
            <h1 className="font-display text-[12vw] leading-[0.85] sm:text-6xl lg:text-7xl mt-3">
              Tudo que o Vital <span className="text-brand">desenha</span>
            </h1>
            <p className="mt-5 text-muted leading-relaxed max-w-sm lg:max-w-lg mx-auto lg:text-lg">
              {MARCA.oQueTem} E um bicho para você montar do seu jeito, peça por
              peça, e levar pronto para tatuar.
            </p>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-3 lg:gap-5 lg:items-start">
        <div className="lg:col-span-2">
        {/* Só quem entrou tem progresso: é pessoal por natureza. */}
        {usuario && totais.pecas > 0 && (
          <section className="moldura mt-6 p-5">
            <div className="flex items-baseline justify-between mb-2.5">
              <p className="etiqueta">Acessórios que você já provou</p>
              <p className="font-display text-lg tabular-nums">
                {vistas}<span className="text-faint">/{totais.pecas}</span>
              </p>
            </div>
            <div className="h-2.5 rounded-full bg-raised overflow-hidden">
              <div className="h-full rounded-full bg-brand transition-[width] duration-700"
                   style={{ width: `${Math.max((vistas / totais.pecas) * 100, vistas ? 3 : 0)}%` }} />
            </div>
            <p className="text-sm text-muted mt-3 leading-relaxed">
              {vistas === 0 ? 'O Vital desenhou todos eles à mão, um por um. Bora ver?'
                : vistas >= totais.pecas ? 'Você viu todos. Sério.'
                : `Faltam ${totais.pecas - vistas} para você ter visto tudo que o Vital desenhou.`}
            </p>
          </section>
        )}

        <nav className="grid grid-cols-2 gap-3 mt-4">
          <Atalho para="/montar" destaque icone={<Palette size={22} />} grande
                  titulo="Montar" texto={usuario ? 'Escolha o bicho e os acessórios' : 'Entre e monte o seu'} />
          <Atalho para="/loja" icone={<ShoppingBag size={20} />}
                  titulo="Loja" texto="Camisetas e cerâmicas" />
          <Atalho para="/tattoos" icone={<Flame size={20} />}
                  titulo="Tattoos" texto="Trabalhos do Vital" />
          {usuario && (
            <Atalho para="/minhas" icone={<Images size={20} />}
                    titulo="Minhas criações" texto="O que você já salvou" />
          )}
          <Atalho para="/sobre" icone={<UserRound size={20} />} grande={!usuario}
                  titulo="Quem é o Vital" texto="A história do traço" />
        </nav>

        </div>

        {catalogo && doDia && (
          <section className="mt-4 lg:mt-6 moldura p-5 lg:sticky lg:top-6">
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

        {usuario && (
          <section className="mt-8 lg:col-span-3">
            <h2 className="etiqueta mb-3">Conquistas</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {conquistasVisiveis(totais).map((c) => {
                const pct = Math.min(c.progresso(progresso, { ...totais, pecas: totais.pecas || 1 }), 1)
                const feita = pct >= 1
                return (
                  <article key={c.id} title={c.descricao}
                    className={`rounded-2xl border-2 p-3 text-center transition-colors ${
                      feita ? 'border-brand bg-brand-soft' : 'border-ink/10'}`}>
                    <span className={`text-2xl block ${feita ? '' : 'grayscale opacity-35'}`}>{c.emoji}</span>
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
        )}
        </div>
      </main>

      {catalogo && <FaixaVitrine catalogo={catalogo} criacoes={vitrine} />}

      <footer className="pb-6 text-center safe-bottom">
        <Link to="/privacidade" className="etiqueta hover:text-ink transition-colors">
          Como usamos seus dados
        </Link>
      </footer>
    </div>
  )
}

function Atalho({ para, titulo, texto, icone, destaque = false, grande = false }: {
  para: string; titulo: string; texto: string
  icone: React.ReactNode; destaque?: boolean; grande?: boolean
}) {
  return (
    <Link to={para}
      className={`moldura p-4 flex flex-col justify-between transition-transform
                  active:translate-y-[2px] ${grande ? 'col-span-2 min-h-[124px]' : 'min-h-[104px]'}
                  ${destaque ? '!bg-brand !text-white' : ''}`}>
      <span className={destaque ? 'text-white' : 'text-brand'}>{icone}</span>
      <span>
        <span className="font-display block text-lg leading-tight mt-2">{titulo}</span>
        <span className={`text-xs block mt-0.5 ${destaque ? 'text-white/80' : 'text-muted'}`}>{texto}</span>
      </span>
    </Link>
  )
}

/** Esteira infinita de criações, no espírito de uma parede de quadros. */
function FaixaVitrine({ catalogo, criacoes }: { catalogo: Catalogo; criacoes: Criacao[] }) {
  const fila = [...criacoes, ...criacoes]
  return (
    <section className="pb-8 overflow-hidden">
      <p className="etiqueta text-center mb-4">Feitas aqui dentro</p>
      <div className="flex gap-5 w-max animate-deslizar hover:[animation-play-state:paused]">
        {fila.map((c, i) => (
          <figure key={`${c.id}-${i}`} className="quadro w-40 lg:w-52 shrink-0">
            <div className="papel rounded flex items-center justify-center p-2">
              <Desenho personagem={acharPersonagem(catalogo, c.personagem)}
                       escolhas={c.escolhas} cor={c.cor} ajustado className="w-full" />
            </div>
            <figcaption className="etiqueta mt-2.5 text-center truncate">{c.autorNome}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
