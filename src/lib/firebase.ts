import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

export type FirebaseWebConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId: string
}

const STORAGE_KEY = 'forge_firebase_config'

function fromEnv(): FirebaseWebConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
  const appId = import.meta.env.VITE_FIREBASE_APP_ID
  if (!apiKey || !authDomain || !projectId || !appId) return null
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId,
  }
}

export function loadStoredConfig(): FirebaseWebConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FirebaseWebConfig
    if (parsed?.apiKey && parsed?.authDomain && parsed?.projectId && parsed?.appId) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function saveStoredConfig(config: FirebaseWebConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function clearStoredConfig(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getResolvedConfig(): FirebaseWebConfig | null {
  return loadStoredConfig() ?? fromEnv()
}

export function isFirebaseConfigured(): boolean {
  return getResolvedConfig() !== null
}

/** Accepts raw JSON or a pasted `firebaseConfig = { ... }` snippet from the Firebase console. */
export function parseFirebaseConfigPaste(input: string): FirebaseWebConfig {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Paste your Firebase web config first')

  let jsonText = trimmed
  if (!trimmed.startsWith('{')) {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start === -1 || end === -1) {
      throw new Error('Could not find a { ... } config object in what you pasted')
    }
    jsonText = trimmed.slice(start, end + 1)
  }

  // Allow unquoted JS object keys / trailing commas / single quotes from console snippets
  const normalized = jsonText
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/'([^']*)'/g, '"$1"')
    .replace(/,(\s*[}\]])/g, '$1')

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(normalized) as Record<string, unknown>
  } catch {
    throw new Error('Config looks invalid. Paste the full firebaseConfig object from Firebase.')
  }

  const apiKey = String(parsed.apiKey ?? '')
  const authDomain = String(parsed.authDomain ?? '')
  const projectId = String(parsed.projectId ?? '')
  const appId = String(parsed.appId ?? '')
  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error('Config needs apiKey, authDomain, projectId, and appId')
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: parsed.storageBucket ? String(parsed.storageBucket) : undefined,
    messagingSenderId: parsed.messagingSenderId
      ? String(parsed.messagingSenderId)
      : undefined,
    appId,
  }
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

export async function resetFirebase(): Promise<void> {
  auth = null
  db = null
  if (app) {
    try {
      await deleteApp(app)
    } catch {
      // ignore if already torn down
    }
    app = null
  }
}

export function getFirebaseApp(): FirebaseApp | null {
  const config = getResolvedConfig()
  if (!config) return null
  if (!app) {
    app = initializeApp(config)
  }
  return app
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null
  if (!auth) auth = getAuth(firebaseApp)
  return auth
}

export function getDb(): Firestore | null {
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null
  if (!db) db = getFirestore(firebaseApp)
  return db
}

export async function connectFirebase(config: FirebaseWebConfig): Promise<void> {
  await resetFirebase()
  saveStoredConfig(config)
  const instance = getFirebaseApp()
  if (!instance) throw new Error('Failed to initialize Firebase')
}

export async function disconnectFirebase(): Promise<void> {
  await resetFirebase()
  clearStoredConfig()
}
