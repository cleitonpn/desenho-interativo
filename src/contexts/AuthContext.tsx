import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  EmailAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged,
  reauthenticateWithCredential, sendEmailVerification, signInWithEmailAndPassword,
  signInWithPopup, signOut, updatePassword, type User,
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
  /**
   * null enquanto a pessoa nao respondeu. Sem isso, "Ainda nao" aparece
   * marcado de saida e o Vital recebe um "nao" que ninguem deu — um mailing
   * com resposta inventada e pior que um sem resposta.
   */
  jaFezArte: boolean | null
}

interface Ctx {
  usuario: User | null
  perfil: Perfil | null
  carregando: boolean
  entrarComEmail: (email: string, senha: string) => Promise<void>
  criarConta: (email: string, senha: string, dados: DadosCadastro) => Promise<void>
  entrarComGoogle: () => Promise<boolean>
  completarPerfil: (dados: DadosCadastro) => Promise<void>
  atualizarPerfil: (dados: DadosCadastro) => Promise<void>
  trocarSenha: (atual: string, nova: string) => Promise<void>
  /** Contas do Google não têm senha para trocar aqui. */
  temSenha: boolean
  /** Contas do Google já chegam com o e-mail confirmado pelo Google. */
  emailVerificado: boolean
  reenviarVerificacao: () => Promise<void>
  /** Recheca no servidor se a pessoa já clicou no link. */
  conferirVerificacao: () => Promise<boolean>
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
      jaFezArte: dados.jaFezArte ?? false,
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
      // Sem isso, o mailing enche de endereço que não existe.
      await sendEmailVerification(cred.user)
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
    async atualizarPerfil(dados) {
      if (!auth.currentUser) throw new Error('Ninguém está logado.')
      await gravarPerfil(auth.currentUser, dados)
    },
    /**
     * O Firebase exige login recente para trocar senha. Em vez de deixar a
     * pessoa levar um erro seco depois de preencher tudo, pedimos a senha atual
     * e reautenticamos na hora.
     */
    async trocarSenha(atual, nova) {
      const u = auth.currentUser
      if (!u?.email) throw new Error('Ninguém está logado.')
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, atual))
      await updatePassword(u, nova)
    },
    temSenha: usuario?.providerData.some((p) => p.providerId === 'password') ?? false,
    emailVerificado: usuario?.emailVerified ?? false,
    async reenviarVerificacao() {
      if (!auth.currentUser) throw new Error('Ninguém está logado.')
      await sendEmailVerification(auth.currentUser)
    },
    /**
     * O objeto de usuário guarda o estado de quando entrou; clicar no link não
     * avisa a aba aberta. Só um reload do servidor mostra a mudança.
     */
    async conferirVerificacao() {
      const u = auth.currentUser
      if (!u) return false
      await u.reload()
      if (u.emailVerified) {
        await setDoc(doc(db, 'usuarios', u.uid), { emailVerificado: true }, { merge: true })
        setUsuario({ ...u } as User)
      }
      return u.emailVerified
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
