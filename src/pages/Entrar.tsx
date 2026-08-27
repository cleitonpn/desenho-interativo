import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { MARCA } from '../config/marca'
import { useAuth, type DadosCadastro } from '../contexts/AuthContext'

type Modo = 'entrar' | 'criar' | 'completar'

const VAZIO: DadosCadastro = { nome: '', whatsapp: '', cidade: '', nascimento: '', jaFezArte: false }

export function Entrar() {
  const navegar = useNavigate()
  const { entrarComEmail, criarConta, entrarComGoogle, completarPerfil } = useAuth()
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [dados, setDados] = useState<DadosCadastro>(VAZIO)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  function campo<K extends keyof DadosCadastro>(k: K, v: DadosCadastro[K]) {
    setDados((d) => ({ ...d, [k]: v }))
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(''); setOcupado(true)
    try {
      if (modo === 'entrar') await entrarComEmail(email, senha)
      else if (modo === 'criar') await criarConta(email, senha, dados)
      else await completarPerfil(dados)
      navegar('/tutorial')
    } catch (err) {
      setErro(traduzir(err))
    } finally {
      setOcupado(false)
    }
  }

  async function google() {
    setErro(''); setOcupado(true)
    try {
      const completo = await entrarComGoogle()
      if (completo) navegar('/tutorial')
      else setModo('completar')
    } catch (err) {
      setErro(traduzir(err))
    } finally {
      setOcupado(false)
    }
  }

  const pedeDados = modo === 'criar' || modo === 'completar'

  return (
    <div className="min-h-dvh px-6 py-8 safe-top safe-bottom">
      <Link to="/" className="inline-flex items-center gap-2 text-muted hover:text-ink transition-colors">
        <ArrowLeft size={18} /> Voltar
      </Link>

      <div className="max-w-sm mx-auto mt-8">
        <p className="etiqueta">{MARCA.nomeCompleto}</p>
        <h1 className="font-display text-4xl mt-2 mb-1">
          {modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Só mais uma coisa'}
        </h1>
        <p className="text-muted text-sm mb-7">
          {modo === 'completar'
            ? 'Para o Vital saber quem fez o desenho e falar com você depois.'
            : 'Sua conta guarda as galinhas que você montar.'}
        </p>

        <form onSubmit={enviar} className="space-y-3">
          {modo !== 'completar' && (
            <>
              <input className="campo" type="email" required placeholder="E-mail" autoComplete="email"
                     value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="campo" type="password" required minLength={6} placeholder="Senha"
                     autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
                     value={senha} onChange={(e) => setSenha(e.target.value)} />
            </>
          )}

          {pedeDados && (
            <>
              <input className="campo" required placeholder="Seu nome"
                     value={dados.nome} onChange={(e) => campo('nome', e.target.value)} />
              <input className="campo" required placeholder="WhatsApp" inputMode="tel"
                     value={dados.whatsapp} onChange={(e) => campo('whatsapp', e.target.value)} />
              <input className="campo" required placeholder="Cidade"
                     value={dados.cidade} onChange={(e) => campo('cidade', e.target.value)} />
              <label className="block">
                <span className="etiqueta ml-1">Data de nascimento</span>
                <input className="campo mt-1" required type="date"
                       value={dados.nascimento} onChange={(e) => campo('nascimento', e.target.value)} />
              </label>

              <fieldset className="moldura-sutil p-4">
                <legend className="etiqueta px-1">Você já fez alguma arte com o Vital?</legend>
                <div className="flex gap-2 mt-2">
                  {[true, false].map((v) => (
                    <button key={String(v)} type="button" onClick={() => campo('jaFezArte', v)}
                      className={`flex-1 rounded-xl border-2 py-2.5 font-semibold transition-colors ${
                        dados.jaFezArte === v
                          ? 'border-brand bg-brand text-white'
                          : 'border-ink/15 text-muted hover:border-ink/30'
                      }`}>
                      {v ? 'Sim' : 'Ainda não'}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {erro && <p className="text-brand text-sm font-medium">{erro}</p>}

          <button className="botao-principal w-full mt-2" disabled={ocupado}>
            {ocupado ? <Loader2 size={18} className="animate-spin" /> : null}
            {modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Continuar'}
          </button>
        </form>

        {modo !== 'completar' && (
          <>
            <div className="flex items-center gap-3 my-5">
              <span className="h-px flex-1 bg-line" />
              <span className="etiqueta">ou</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <button onClick={google} disabled={ocupado} className="botao-neutro w-full">
              Continuar com Google
            </button>
            <p className="text-center text-sm text-muted mt-6">
              {modo === 'entrar' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
              <button className="font-semibold text-brand underline underline-offset-2"
                      onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setErro('') }}>
                {modo === 'entrar' ? 'Criar agora' : 'Entrar'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function traduzir(err: unknown): string {
  const codigo = (err as { code?: string })?.code ?? ''
  const mapa: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha não conferem.',
    'auth/invalid-email': 'Esse e-mail não parece válido.',
    'auth/weak-password': 'A senha precisa de pelo menos 6 caracteres.',
    'auth/email-already-in-use': 'Já existe conta com esse e-mail. Tente entrar.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar.',
    'auth/network-request-failed': 'Sem conexão. Verifique a internet e tente de novo.',
  }
  return mapa[codigo] ?? 'Não deu certo agora. Tente de novo em instantes.'
}
