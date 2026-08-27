import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword,
  signInWithPopup, signOut, type User,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'
import type { Perfil } from '../lib/tipos'

/** Campos do cadastro que alimentam o mailing do Vital. */
export interface DadosCadastro {
  nome: string
  whatsapp: string
  cidade: string
  nascimento: string
  jaFezArte: boolean
}

interface Ctx {
  usuario: User | null
  perfil: Perfil | null
  carregando: boolean
  entrarComEmail: (email: string, senha: string) => Promise<void>
  criarConta: (email: string, senha: string, dados: DadosCadastro) => Promise<void>
  entrarComGoogle: () => Promise<boolean>
  completarPerfil: (dados: DadosCadastro) => Promise<void>
  sair: () => Promise<void>
}

const AuthCtx = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUsuario(u)
      if (u) {
        const snap = await getDoc(doc(db, 'usuarios', u.uid))
        setPerfil(snap.exists() ? ({ uid: u.uid, ...snap.data() } as Perfil) : null)
      } else {
        setPerfil(null)
      }
      setCarregando(false)
    })
  }, [])

  async function gravarPerfil(u: User, dados: DadosCadastro) {
    const novo = {
      nome: dados.nome,
      email: u.email ?? '',
      whatsapp: dados.whatsapp,
      cidade: dados.cidade,
      nascimento: dados.nascimento,
      jaFezArte: dados.jaFezArte,
      criadoEm: serverTimestamp(),
    }
    await setDoc(doc(db, 'usuarios', u.uid), novo, { merge: true })
    setPerfil({ uid: u.uid, ...novo, criadoEm: Date.now() } as Perfil)
  }

  const valor: Ctx = {
    usuario,
    perfil,
    carregando,
    async entrarComEmail(email, senha) {
      await signInWithEmailAndPassword(auth, email, senha)
    },
    async criarConta(email, senha, dados) {
      const cred = await createUserWithEmailAndPassword(auth, email, senha)
      await gravarPerfil(cred.user, dados)
    },
    /** Devolve true se o perfil já existe; false se ainda falta completar. */
    async entrarComGoogle() {
      const cred = await signInWithPopup(auth, googleProvider)
      const snap = await getDoc(doc(db, 'usuarios', cred.user.uid))
      if (snap.exists()) {
        setPerfil({ uid: cred.user.uid, ...snap.data() } as Perfil)
        return true
      }
      return false
    },
    async completarPerfil(dados) {
      if (!auth.currentUser) throw new Error('Ninguém está logado.')
      await gravarPerfil(auth.currentUser, dados)
    },
    async sair() {
      await signOut(auth)
    },
  }

  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return ctx
}
