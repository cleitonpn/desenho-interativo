import type { DadosCadastro } from '../contexts/AuthContext'

interface Props {
  dados: DadosCadastro
  aoMudar: (dados: DadosCadastro) => void
}

/**
 * Os campos do mailing. Vivem num componente só porque aparecem em três
 * lugares — cadastro por e-mail, complemento depois do Google e edição na
 * conta — e precisam pedir exatamente as mesmas coisas nos três.
 */
export function CamposDoCadastro({ dados, aoMudar }: Props) {
  function campo<K extends keyof DadosCadastro>(k: K, v: DadosCadastro[K]) {
    aoMudar({ ...dados, [k]: v })
  }

  return (
    <>
      <label className="block">
        <span className="etiqueta ml-1">Seu nome</span>
        <input className="campo mt-1" required value={dados.nome}
               onChange={(e) => campo('nome', e.target.value)} />
      </label>
      <label className="block">
        <span className="etiqueta ml-1">WhatsApp</span>
        <input className="campo mt-1" required inputMode="tel" placeholder="(11) 90000-0000"
               value={dados.whatsapp} onChange={(e) => campo('whatsapp', e.target.value)} />
      </label>
      <label className="block">
        <span className="etiqueta ml-1">Cidade</span>
        <input className="campo mt-1" required value={dados.cidade}
               onChange={(e) => campo('cidade', e.target.value)} />
      </label>
      <label className="block">
        <span className="etiqueta ml-1">Data de nascimento</span>
        <input className="campo mt-1" required type="date" value={dados.nascimento}
               onChange={(e) => campo('nascimento', e.target.value)} />
      </label>

      <fieldset className="moldura-sutil p-4">
        <legend className="etiqueta px-1">Já fez alguma arte com o Vital?</legend>
        <div className="flex gap-2 mt-2">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" onClick={() => campo('jaFezArte', v)}
              className={`flex-1 rounded-xl border-2 py-2.5 font-semibold transition-colors ${
                dados.jaFezArte === v ? 'border-brand bg-brand text-white'
                  : 'border-ink/15 text-muted hover:border-ink/30'}`}>
              {v ? 'Sim' : 'Ainda não'}
            </button>
          ))}
        </div>
      </fieldset>
    </>
  )
}
