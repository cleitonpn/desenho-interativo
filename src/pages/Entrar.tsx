import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { MARCA } from '../config/marca'
import { CamposDoCadastro } from '../components/CamposDoCadastro'
import { useAuth, type DadosCadastro } from '../contexts/AuthContext'

type Modo = 'entrar' | 'criar'

const VAZIO: DadosCadastro = { nome: '', whatsapp: '', cidade: '', nascimento: '', jaFezArte: null }

export function Entrar() {
  const navegar = useNavigate()
  // Quem foi barrado numa tela protegida volta para ela depois de entrar, em
  // vez de cair na home e ter de achar o caminho de novo.
  const destino = (useLocation().state as { destino?: string } | null)?.destino ?? '/montar'
  const { entrarComEmail, criarConta, entrarComGoogle } = useAuth()
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [dados, setDados] = useState<DadosCadastro>(VAZIO)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const criando = modo === 'criar'
  const faltaResponder = criando && dados.jaFezArte === null

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(''); setOcupado(true)
    try {
      if (criando) {
        await criarConta(email, senha, dados)
        navegar('/verificar')
      } else {
        await entrarComEmail(email, senha)
        navegar(destino)
      }
    } catch (err) {
      setErro(traduzir(err))
      setOcupado(false)
    }
  }

  async function google() {
    setErro(''); setOcupado(true)
    try {
      // Sem perfil, o roteador leva para /completar — o Google devolve só nome
      // e e-mail, e o resto do cadastro ainda precisa ser preenchido.
      navegar((await entrarComGoogle()) ? destino : '/completar')
    } catch (err) {
      setErro(traduzir(err))
      setOcupado(false)
    }
  }

  return (
    <div className="min-h-dvh px-6 py-8 safe-top safe-bottom">
      <Link to="/" className="inline-flex items-center gap-2 text-muted hover:text-ink transition-colors">
        <ArrowLeft size={18} /> Voltar
      </Link>

      <div className="max-w-sm mx-auto mt-8">
        <p className="etiqueta">{MARCA.nomeCompleto}</p>
        <h1 className="font-display text-4xl mt-2 mb-1">{criando ? 'Criar conta' : 'Entrar'}</h1>
        <p className="text-muted text-sm mb-7">Sua conta guarda os desenhos que você montar.</p>

        <form onSubmit={enviar} className="space-y-3">
          <input className="campo" type="email" required placeholder="E-mail" autoComplete="email"
                 value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="campo" type="password" required minLength={6} placeholder="Senha"
                 autoComplete={criando ? 'new-password' : 'current-password'}
                 value={senha} onChange={(e) => setSenha(e.target.value)} />

          {criando && <CamposDoCadastro dados={dados} aoMudar={setDados} pedirConsentimento />}

          {erro && <p className="text-brand text-sm font-medium">{erro}</p>}

          <button className="botao-principal w-full mt-2" disabled={ocupado || faltaResponder}>
            {ocupado ? <Loader2 size={18} className="animate-spin" /> : null}
            {criando ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <span className="h-px flex-1 bg-line" />
          <span className="etiqueta">ou</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <button onClick={google} disabled={ocupado} className="botao-neutro w-full">
          Continuar com Google
        </button>

        <p className="text-center text-sm text-muted mt-6">
          {criando ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
          <button className="font-semibold text-brand underline underline-offset-2"
                  onClick={() => { setModo(criando ? 'entrar' : 'criar'); setErro('') }}>
            {criando ? 'Entrar' : 'Criar agora'}
          </button>
        </p>
      </div>
    </div>
  )
}

function traduzir(err: unknown): string {
  const codigo = (err as { code?: string })?.code ?? ''
  const mapa: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha não conferem.',
    'auth/user-not-found': 'Não achei conta com esse e-mail. Crie uma abaixo.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-email': 'Esse e-mail não parece válido.',
    'auth/weak-password': 'A senha precisa de pelo menos 6 caracteres.',
    'auth/email-already-in-use': 'Já existe conta com esse e-mail. Tente entrar.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere os pop-ups e tente de novo.',
    'auth/network-request-failed': 'Sem conexão. Verifique a internet e tente de novo.',
    'auth/too-many-requests': 'Muitas tentativas seguidas. Espere um minuto.',
    // Estes dois são configuração do projeto, não erro de quem está entrando:
    // dizer isso por extenso evita horas procurando no lugar errado.
    'auth/unauthorized-domain': `O Firebase ainda não libera login em ${location.hostname}. `
      + 'No console: Authentication → Settings → Domínios autorizados → adicionar este domínio.',
    'auth/operation-not-allowed': 'Esse jeito de entrar não está habilitado no Firebase '
      + '(Authentication → Sign-in method).',
  }
  if (mapa[codigo]) return mapa[codigo]
  // Sem o código na tela, um erro de configuração vira adivinhação.
  return codigo ? `Não deu certo: ${codigo}` : 'Não deu certo agora. Tente de novo em instantes.'
}
