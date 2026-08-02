import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
  type Unsubscribe,
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from './firebase'

export function watchAuth(
  onUser: (user: User | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const auth = getFirebaseAuth()
  if (!auth) {
    onUser(null)
    return () => undefined
  }
  return onAuthStateChanged(
    auth,
    onUser,
    (err) => onError?.(err),
  )
}

export async function signUp(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth()
  if (!auth) throw new Error('Firebase is not configured')
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
  return cred.user
}

export async function signIn(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth()
  if (!auth) throw new Error('Firebase is not configured')
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
  return cred.user
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth()
  if (!auth) return
  await firebaseSignOut(auth)
}

export { isFirebaseConfigured }
