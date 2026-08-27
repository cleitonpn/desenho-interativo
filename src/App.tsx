import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { FiltrosSvg } from './components/FiltrosSvg'
import { Abertura } from './pages/Abertura'
import { Entrar } from './pages/Entrar'
import { Tutorial } from './pages/Tutorial'
import { Editor } from './pages/Editor'
import { MinhasGalinhas } from './pages/MinhasGalinhas'
import { Conta } from './pages/Conta'
import { CompletarCadastro } from './pages/CompletarCadastro'
import { Admin } from './pages/admin/Admin'
import type { ReactNode } from 'react'

export default function App() {
  return (
    <AuthProvider>
      <FiltrosSvg />
      <Routes>
        <Route path="/" element={<SoVisitante><Abertura /></SoVisitante>} />
        <Route path="/entrar" element={<SoVisitante><Entrar /></SoVisitante>} />
        <Route path="/completar" element={<PrecisaPerfil />} />
        <Route path="/tutorial" element={<Protegida><Tutorial /></Protegida>} />
        <Route path="/montar" element={<Protegida><Editor /></Protegida>} />
        <Route path="/minhas" element={<Protegida><MinhasGalinhas /></Protegida>} />
        <Route path="/conta" element={<Protegida><Conta /></Protegida>} />
        <Route path="/vital" element={<Protegida><Admin /></Protegida>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

function Espera() {
  return <div className="min-h-dvh grid place-items-center text-muted"><Loader2 className="animate-spin" /></div>
}

function Protegida({ children }: { children: ReactNode }) {
  const { usuario, perfil, carregando } = useAuth()
  if (carregando) return <Espera />
  if (!usuario) return <Navigate to="/entrar" replace />
  // Entrar pelo Google autentica sem criar perfil: o Google devolve só nome e
  // e-mail. Sem esta parada, a pessoa cairia direto no editor e o Vital ficaria
  // com um cadastro pela metade.
  if (!perfil) return <Navigate to="/completar" replace />
  return <>{children}</>
}

/** A tela de completar cadastro é o único lugar que aceita conta sem perfil. */
function PrecisaPerfil() {
  const { usuario, perfil, carregando } = useAuth()
  if (carregando) return <Espera />
  if (!usuario) return <Navigate to="/entrar" replace />
  if (perfil) return <Navigate to="/montar" replace />
  return <CompletarCadastro />
}

/** Quem já entrou não precisa rever a abertura: vai direto montar. */
function SoVisitante({ children }: { children: ReactNode }) {
  const { usuario, perfil, carregando } = useAuth()
  if (carregando) return <Espera />
  if (!usuario) return <>{children}</>
  if (!perfil) return <Navigate to="/completar" replace />
  const viuTutorial = localStorage.getItem('quintal:tutorial') === 'visto'
  return <Navigate to={viuTutorial ? '/montar' : '/tutorial'} replace />
}
