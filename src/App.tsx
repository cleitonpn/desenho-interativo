import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Abertura } from './pages/Abertura'
import { Entrar } from './pages/Entrar'
import { Tutorial } from './pages/Tutorial'
import { Editor } from './pages/Editor'
import { MinhasGalinhas } from './pages/MinhasGalinhas'
import { Admin } from './pages/admin/Admin'
import type { ReactNode } from 'react'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<SoVisitante><Abertura /></SoVisitante>} />
        <Route path="/entrar" element={<SoVisitante><Entrar /></SoVisitante>} />
        <Route path="/tutorial" element={<Protegida><Tutorial /></Protegida>} />
        <Route path="/montar" element={<Protegida><Editor /></Protegida>} />
        <Route path="/minhas" element={<Protegida><MinhasGalinhas /></Protegida>} />
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
  const { usuario, carregando } = useAuth()
  if (carregando) return <Espera />
  return usuario ? <>{children}</> : <Navigate to="/entrar" replace />
}

/** Quem já entrou não precisa rever a abertura: vai direto montar. */
function SoVisitante({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth()
  if (carregando) return <Espera />
  if (!usuario) return <>{children}</>
  const viuTutorial = localStorage.getItem('quintal:tutorial') === 'visto'
  return <Navigate to={viuTutorial ? '/montar' : '/tutorial'} replace />
}
