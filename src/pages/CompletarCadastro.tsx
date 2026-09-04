import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, LogOut } from 'lucide-react'
import { MARCA } from '../config/marca'
import { CamposDoCadastro } from '../components/CamposDoCadastro'
import { useAuth, type DadosCadastro } from '../contexts/AuthContext'

const VAZIO: DadosCadastro = { nome: '', whatsapp: '', cidade: '', nascimento: '', jaFezArte: null }

/**
 * Quem entra pelo Google chega autenticado mas sem os dados do mailing — o
 * Google só devolve nome e e-mail. Esta tela é a etapa que faltava, e ela não
 * pode ser pulada: o roteador manda para cá qualquer conta sem perfil, mesmo
 * depois de um refresh.
 */
export function CompletarCadastro() {
  const navegar = useNavigate()
  const { usuario, completarPerfil, sair } = useAuth()
  const [dados, setDados] = useState<DadosCadastro>({
    ...VAZIO,
    // O nome do Google já vem preenchido; é o único campo que dá para adiantar.
    nome: usuario?.displayName ?? '',
  })
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setOcupado(true); setErro('')
    try {
      await completarPerfil(dados)
      navegar('/tutorial', { replace: true })
    } catch {
      setErro('Não consegui salvar agora. Tente de novo.')
      setOcupado(false)
    }
  }

  return (
    <div className="min-h-dvh px-6 py-8 safe-top safe-bottom">
      <div className="max-w-sm mx-auto">
        <p className="etiqueta">{MARCA.nomeCompleto}</p>
        <h1 className="font-display text-4xl mt-2 mb-1">Só mais uma coisa</h1>
        <p className="text-muted text-sm mb-7">
          Entrou como <strong className="text-ink">{usuario?.email}</strong>. Falta o
          Vital saber com quem está falando.
        </p>

        <form onSubmit={enviar} className="space-y-3">
          <CamposDoCadastro dados={dados} aoMudar={setDados} pedirConsentimento />
          {erro && <p className="text-brand text-sm font-medium">{erro}</p>}
          <button className="botao-principal w-full mt-2"
                  disabled={ocupado || dados.jaFezArte === null}>
            {ocupado ? <Loader2 size={18} className="animate-spin" /> : null} Continuar
          </button>
        </form>

        <button onClick={sair} className="w-full mt-6 py-3 text-sm font-semibold text-muted
                                          hover:text-brand transition-colors
                                          inline-flex items-center justify-center gap-2">
          <LogOut size={16} /> Entrar com outra conta
        </button>
      </div>
    </div>
  )
}
