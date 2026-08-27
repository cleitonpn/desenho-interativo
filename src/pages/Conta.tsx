import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, KeyRound, Loader2, LogOut, ShieldCheck } from 'lucide-react'
import { MARCA } from '../config/marca'
import { CamposDoCadastro } from '../components/CamposDoCadastro'
import { useAuth, type DadosCadastro } from '../contexts/AuthContext'
import { renomearAutor } from '../lib/criacoes'

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
    await sair()
    navegar('/', { replace: true })
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

        <button onClick={sairEVoltar} className="w-full mt-8 py-3 font-semibold text-brand
                                                 hover:bg-brand-soft rounded-xl transition-colors
                                                 inline-flex items-center justify-center gap-2">
          <LogOut size={18} /> Sair da conta
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
