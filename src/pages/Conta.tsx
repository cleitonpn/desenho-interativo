import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, KeyRound, Loader2, LogOut, ShieldCheck, Trash2 } from 'lucide-react'
import { MARCA } from '../config/marca'
import { CamposDoCadastro } from '../components/CamposDoCadastro'
import { useAuth, type DadosCadastro } from '../contexts/AuthContext'
import { apagarTudoDoUsuario, renomearAutor } from '../lib/criacoes'

const VAZIO: DadosCadastro = { nome: '', whatsapp: '', cidade: '', nascimento: '', jaFezArte: null }

export function Conta() {
  const navegar = useNavigate()
  const { usuario, perfil, atualizarPerfil, trocarSenha, temSenha, sair } = useAuth()
  const [dados, setDados] = useState<DadosCadastro>(VAZIO)
  const [salvo, setSalvo] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  // O perfil chega do Firestore depois da primeira renderização.
  useEffect(() => {
    if (perfil) {
      setDados({
        nome: perfil.nome ?? '', whatsapp: perfil.whatsapp ?? '', cidade: perfil.cidade ?? '',
        nascimento: perfil.nascimento ?? '', jaFezArte: Boolean(perfil.jaFezArte),
      })
    }
  }, [perfil])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setOcupado(true); setErro('')
    try {
      await atualizarPerfil(dados)
      // A vitrine mostra o nome gravado junto da criacao; sem isso ela
      // continuaria exibindo o nome antigo.
      if (usuario && dados.nome !== perfil?.nome) await renomearAutor(usuario.uid, dados.nome)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2600)
    } catch {
      setErro('Não consegui salvar agora. Tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  async function sairEVoltar() {
    // A ordem importa: sair primeiro faria o guard desta tela ver "sem usuário"
    // e mandar para o login antes de a navegação acontecer. Saindo da tela
    // protegida antes, o logout acontece já na home pública.
    navegar('/', { replace: true })
    await sair()
  }

  return (
    <div className="min-h-dvh px-5 py-6 safe-top safe-bottom">
      <Link to="/montar" className="inline-flex items-center gap-2 text-muted hover:text-ink transition-colors">
        <ArrowLeft size={18} /> Montar
      </Link>

      <div className="max-w-sm mx-auto mt-6">
        <p className="etiqueta">{MARCA.nomeCompleto}</p>
        <h1 className="font-display text-3xl mt-2 mb-6">Minha conta</h1>

        <form onSubmit={salvar} className="space-y-3">
          <label className="block">
            <span className="etiqueta ml-1">E-mail</span>
            {/* Trocar e-mail exige confirmação por link; fica fora daqui de propósito. */}
            <input className="campo mt-1 opacity-60" value={usuario?.email ?? ''} disabled />
          </label>
          <CamposDoCadastro dados={dados} aoMudar={setDados} />

          {erro && <p className="text-brand text-sm font-medium">{erro}</p>}

          <button className="botao-principal w-full" disabled={ocupado || dados.jaFezArte === null}>
            {ocupado ? <Loader2 size={18} className="animate-spin" />
              : salvo ? <Check size={18} /> : null}
            {salvo ? 'Salvo!' : 'Salvar alterações'}
          </button>
        </form>

        {temSenha ? <TrocarSenha aoTrocar={trocarSenha} /> : (
          <p className="mt-8 text-sm text-muted moldura-sutil p-4">
            Você entra com a conta do Google, então a senha é gerenciada por lá.
          </p>
        )}

        {perfil?.admin && (
          <Link to="/vital" className="botao-neutro w-full mt-4">
            <ShieldCheck size={18} /> Painel do Vital
          </Link>
        )}

        <ApagarConta uid={usuario?.uid ?? ''} />

        <button onClick={sairEVoltar} className="w-full mt-4 py-3 font-semibold text-brand
                                                 hover:bg-brand-soft rounded-xl transition-colors
                                                 inline-flex items-center justify-center gap-2">
          <LogOut size={18} /> Sair da conta
        </button>
      </div>
    </div>
  )
}

/**
 * Apagar a conta é um direito, então precisa estar aqui e funcionar de
 * verdade — mas não pode ser um toque acidental. Pedir a palavra por extenso
 * separa quem quer disso de quem esbarrou.
 */
function ApagarConta({ uid }: { uid: string }) {
  const navegar = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const [apagando, setApagando] = useState(false)
  const [erro, setErro] = useState('')

  async function apagar() {
    setApagando(true); setErro('')
    try {
      await apagarTudoDoUsuario(uid)
      navegar('/', { replace: true })
    } catch (e) {
      const codigo = (e as { code?: string })?.code ?? ''
      setErro(codigo === 'auth/requires-recent-login'
        ? 'Por segurança, saia e entre de novo antes de apagar a conta.'
        : 'Não consegui apagar agora. Tente de novo em instantes.')
      setApagando(false)
    }
  }

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)}
              className="w-full mt-10 py-3 text-sm font-semibold text-faint hover:text-brand
                         transition-colors inline-flex items-center justify-center gap-2">
        <Trash2 size={15} /> Apagar minha conta
      </button>
    )
  }

  return (
    <div className="mt-10 rounded-2xl border-2 border-brand p-4 space-y-3">
      <p className="font-semibold">Apagar a conta e tudo que você salvou?</p>
      <p className="text-sm text-muted leading-relaxed">
        Some o seu cadastro e todas as suas criações, de vez. Não dá para desfazer.
      </p>
      <label className="block">
        <span className="etiqueta">Digite APAGAR para confirmar</span>
        <input className="campo mt-1" value={confirmacao} autoFocus
               onChange={(e) => setConfirmacao(e.target.value.toUpperCase())} />
      </label>
      {erro && <p className="text-brand text-sm font-medium">{erro}</p>}
      <div className="flex gap-2">
        <button onClick={() => { setAberto(false); setConfirmacao(''); setErro('') }}
                className="botao-neutro flex-1 !py-2.5">Cancelar</button>
        <button onClick={apagar} disabled={confirmacao !== 'APAGAR' || apagando}
                className="botao-principal flex-1 !py-2.5 disabled:opacity-40">
          {apagando ? <Loader2 size={16} className="animate-spin" /> : null} Apagar
        </button>
      </div>
    </div>
  )
}

function TrocarSenha({ aoTrocar }: { aoTrocar: (atual: string, nova: string) => Promise<void> }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [estado, setEstado] = useState<'parado' | 'indo' | 'feito'>('parado')
  const [erro, setErro] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEstado('indo'); setErro('')
    try {
      await aoTrocar(atual, nova)
      setEstado('feito'); setAtual(''); setNova('')
      setTimeout(() => setEstado('parado'), 3000)
    } catch (err) {
      const codigo = (err as { code?: string })?.code ?? ''
      setErro(codigo === 'auth/invalid-credential' || codigo === 'auth/wrong-password'
        ? 'A senha atual não confere.'
        : codigo === 'auth/weak-password' ? 'A nova senha precisa de 6 caracteres ou mais.'
        : 'Não consegui trocar a senha agora.')
      setEstado('parado')
    }
  }

  return (
    <form onSubmit={enviar} className="mt-8 moldura-sutil p-4 space-y-3">
      <p className="etiqueta flex items-center gap-1.5"><KeyRound size={13} /> Trocar senha</p>
      <input className="campo" type="password" required placeholder="Senha atual"
             autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} />
      <input className="campo" type="password" required minLength={6} placeholder="Nova senha"
             autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} />
      {erro && <p className="text-brand text-sm">{erro}</p>}
      <button className="botao-neutro w-full !py-2.5" disabled={estado === 'indo'}>
        {estado === 'indo' ? <Loader2 size={16} className="animate-spin" />
          : estado === 'feito' ? <Check size={16} /> : null}
        {estado === 'feito' ? 'Senha trocada' : 'Trocar senha'}
      </button>
    </form>
  )
}
