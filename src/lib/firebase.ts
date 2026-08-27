import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Config de app web do Firebase e publica por natureza: quem protege os dados
// sao as regras em firestore.rules / storage.rules, nao esta chave.
const firebaseConfig = {
  apiKey: 'AIzaSyDc6JP-t_fLXECPdX6s5g9tMYFBgjClTQ8',
  authDomain: 'galeriadovital.firebaseapp.com',
  projectId: 'galeriadovital',
  storageBucket: 'galeriadovital.firebasestorage.app',
  messagingSenderId: '731323588702',
  appId: '1:731323588702:web:a54ec7d3c266390fead4cf',
  measurementId: 'G-XTZB2Z84GG',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()
