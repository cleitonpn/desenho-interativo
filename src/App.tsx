import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { FiltrosSvg } from './components/FiltrosSvg'
import { Home } from './pages/Home'
import { Entrar } from './pages/Entrar'
import { CompletarCadastro } from './pages/CompletarCadastro'
import { VerificarEmail } from './pages/VerificarEmail'
import { Tutorial } from './pages/Tutorial'
import { Editor } from './pages/Editor'
import { MinhasCriacoes } from './pages/MinhasCriacoes'
import { Conta } from './pages/Conta'
import { Privacidade } from './pages/Privacidade'
import { Sobre } from './pages/Sobre'
import { Tattoos } from './pages/Tattoos'
import { Loja } from './pages/Loja'
const Jogo = lazy(() => import('./pages/Jogo').then(m => ({ default: m.Jogo })))

// O painel só interessa ao Vital: carregado à parte para não pesar no
// carregamento de quem entrou para montar um bicho.
const Admin = lazy(() => import('./pages/admin/Admin').then((m) => ({ default: m.Admin })))

/**
 * Quem ve o que.
 *
 * Publico: a home, a loja, as tattoos, a bio e a politica. Uma loja escondida
 * atras de login nao vende — ninguem cria conta para so entao descobrir se ha
 * algo que preste.
 *
 * Com login: montar um bicho, as suas criacoes e a sua conta. Sao as telas que
 * so existem porque ha um "voce"; sem isso nao ha o que mostrar. O checkout
 * pedira login na hora de fechar, como em qualquer loja.
 */
export default function App() {
  return (
    <AuthProvider>
      <FiltrosSvg />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/loja" element={<Loja />} />
        <Route path="/jogo" element={<Suspense fallback={<Espera />}><Jogo /></Suspense>} />
        <Route path="/tattoos" element={<Tattoos />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="/privacidade" element={<Privacidade />} />

        <Route path="/entrar" element={<SoVisitante><Entrar /></SoVisitante>} />
        <Route path="/completar" element={<PrecisaPerfil />} />
        <Route path="/verificar" element={<PrecisaVerificar />} />

        <Route path="/tutorial" element={<Protegida><Tutorial /></Protegida>} />
        <Route path="/montar" element={<Protegida><Editor /></Protegida>} />
        <Route path="/minhas" element={<Protegida><MinhasCriacoes /></Protegida>} />
        <Route path="/conta" element={<Protegida><Conta /></Protegida>} />
        <Route path="/vital" element={
          <Protegida><Suspense fallback={<Espera />}><Admin /></Suspense></Protegida>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

function Espera() {
  return <div className="min-h-dvh grid place-items-center text-muted"><Loader2 className="animate-spin" /></div>
}

function Protegida({ children }: { children: ReactNode }) {
  const { usuario, perfil, carregando, emailVerificado, temSenha } = useAuth()
  const local = useLocation()

  if (carregando) return <Espera />
  // Guarda de onde a pessoa veio: depois de entrar ela volta para cá, em vez
  // de cair na home e ter de achar o caminho de novo.
  if (!usuario) return <Navigate to="/entrar" replace state={{ destino: local.pathname }} />
  // Entrar pelo Google autentica sem criar perfil: o Google devolve só nome e
  // e-mail. Sem esta parada, o Vital ficaria com um cadastro pela metade.
  if (!perfil) return <Navigate to="/completar" replace />
  // Conta por e-mail e senha aceita qualquer texto com @: sem confirmar, o
  // mailing enche de endereço que não existe. O Google já confirma o dele.
  if (temSenha && !emailVerificado) return <Navigate to="/verificar" replace />
  return <>{children}</>
}

/** A tela de completar cadastro é o único lugar que aceita conta sem perfil. */
function PrecisaPerfil() {
  const { usuario, perfil, carregando } = useAuth()
  if (carregando) return <Espera />
  if (!usuario) return <Navigate to="/" replace />
  if (perfil) return <Navigate to="/montar" replace />
  return <CompletarCadastro />
}

/** Idem para o e-mail ainda não confirmado. */
function PrecisaVerificar() {
  const { usuario, carregando, emailVerificado, temSenha } = useAuth()
  if (carregando) return <Espera />
  if (!usuario) return <Navigate to="/" replace />
  if (emailVerificado || !temSenha) return <Navigate to="/montar" replace />
  return <VerificarEmail />
}

/** Quem já entrou não precisa do formulário de login. */
function SoVisitante({ children }: { children: ReactNode }) {
  const { usuario, perfil, carregando, emailVerificado, temSenha } = useAuth()
  if (carregando) return <Espera />
  if (!usuario) return <>{children}</>
  if (!perfil) return <Navigate to="/completar" replace />
  if (temSenha && !emailVerificado) return <Navigate to="/verificar" replace />
  return <Navigate to="/" replace />
}
