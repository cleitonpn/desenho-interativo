import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MARCA } from '../config/marca'

/**
 * Politica de privacidade. Escrita em portugues comum, sem juridiques: quem le
 * precisa entender o que esta entregando, e um texto que so um advogado
 * decifra nao informa ninguem — que e justamente o que a LGPD pede.
 */
export function Privacidade() {
  return (
    <div className="min-h-dvh px-6 py-8 safe-top safe-bottom">
      <Link to="/" className="inline-flex items-center gap-2 text-muted hover:text-ink transition-colors">
        <ArrowLeft size={18} /> Voltar
      </Link>

      <article className="max-w-xl mx-auto mt-8 space-y-7">
        <header>
          <p className="etiqueta">{MARCA.nomeCompleto}</p>
          <h1 className="font-display text-4xl mt-2">Privacidade</h1>
          <p className="text-muted mt-3 leading-relaxed">
            Em resumo: pedimos seus dados para o Vital saber com quem está falando
            e conseguir te achar depois. Nada é vendido nem repassado para ninguém.
          </p>
        </header>

        <Secao titulo="O que guardamos">
          <p>Quando você cria a conta: <strong>nome, e-mail, WhatsApp, cidade,
            data de nascimento</strong> e se você já fez alguma arte com o Vital.</p>
          <p>Enquanto usa o app: as <strong>galinhas que você monta e salva</strong> e
            números de uso — quais acessórios são escolhidos, quanto tempo as pessoas
            ficam, se usam o sorteio. Esses números são olhados em conjunto, para o Vital
            decidir o que desenhar; ninguém abre a sua sessão para ver o que você fez.</p>
        </Secao>

        <Secao titulo="Para que serve">
          <p>Seu <strong>nome e WhatsApp</strong> são como o Vital responde quando você
            manda uma galinha para tatuar.</p>
          <p>Seu <strong>e-mail</strong> pode ser usado para avisar de novidades do
            estúdio. Dá para pedir para sair dessa lista quando quiser — é só falar com
            a gente pelo WhatsApp.</p>
          <p>A <strong>data de nascimento</strong> serve para o Vital lembrar do seu
            aniversário, e nada além disso.</p>
        </Secao>

        <Secao titulo="O que aparece para outras pessoas">
          <p>A tela inicial mostra galinhas montadas aqui dentro, com o
            <strong> primeiro nome</strong> de quem montou. É a vitrine do app, e ela é
            pública — qualquer pessoa vê, mesmo sem ter conta.</p>
          <p>Seu e-mail, WhatsApp, cidade e nascimento <strong>nunca</strong> aparecem
            ali, nem em lugar nenhum público.</p>
        </Secao>

        <Secao titulo="Quem tem acesso">
          <p>Só o Vital e quem cuida do app. Os dados ficam no Firebase, do Google, que
            é quem hospeda o serviço.</p>
          <p>Não vendemos, não alugamos e não trocamos seus dados com ninguém.</p>
        </Secao>

        <Secao titulo="Apagar tudo">
          <p>Você pode apagar sua conta a qualquer momento, na tela
            <strong> Minha conta</strong>. Isso apaga seu cadastro e todas as galinhas
            que você salvou, de vez — não fica cópia.</p>
        </Secao>

        <Secao titulo="Falar com a gente">
          <p>Qualquer dúvida, pedido de correção ou de exclusão:
            {' '}<a className="text-brand font-semibold underline underline-offset-2"
                   href={`https://wa.me/${MARCA.whatsapp}`} target="_blank" rel="noreferrer">
              WhatsApp do estúdio
            </a>.</p>
        </Secao>

        <p className="etiqueta pt-4">Atualizado em setembro de 2026</p>
      </article>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl mb-2">{titulo}</h2>
      <div className="space-y-2 text-muted leading-relaxed [&_strong]:text-ink">{children}</div>
    </section>
  )
}
