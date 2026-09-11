import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
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

// Explicit development-only switch keeps automated tests away from production.
const emulators = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === '1'
if (emulators) firebaseConfig.projectId = 'demo-quintal'

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()
if (emulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
