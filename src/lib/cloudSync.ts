import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import type { AppState } from '../types'
import { createInitialState } from '../store/storage'
import { getDb } from './firebase'

export type CloudDoc = {
  state: AppState
  updatedAt: number
  version: number
}

const DOC_VERSION = 1

/** Progress photos stay device-local — never upload base64 blobs to Firestore. */
export function stripPrivateLocalData(state: AppState): AppState {
  return {
    ...state,
    progressPhotos: [],
    activeWorkoutId: null,
    activeSimId: null,
  }
}

export function mergeCloudState(cloud: AppState, local: AppState): AppState {
  const base = createInitialState()
  return {
    ...base,
    ...cloud,
    profile: { ...base.profile, ...cloud.profile },
    foodLibrary: cloud.foodLibrary?.length ? cloud.foodLibrary : base.foodLibrary,
    mealTemplates: cloud.mealTemplates?.length ? cloud.mealTemplates : base.mealTemplates,
    plan: cloud.plan?.length ? cloud.plan : base.plan,
    // Keep private media on this device
    progressPhotos: local.progressPhotos,
    activeWorkoutId: local.activeWorkoutId,
    activeSimId: local.activeSimId,
  }
}

function userDocRef(uid: string) {
  const db = getDb()
  if (!db) return null
  return doc(db, 'users', uid, 'data', 'forge')
}

export async function pullUserState(uid: string): Promise<AppState | null> {
  const ref = userDocRef(uid)
  if (!ref) return null
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data() as CloudDoc
  return data.state ?? null
}

export async function pushUserState(uid: string, state: AppState): Promise<void> {
  const ref = userDocRef(uid)
  if (!ref) throw new Error('Firestore not configured')
  const payload: CloudDoc = {
    state: stripPrivateLocalData(state),
    updatedAt: Date.now(),
    version: DOC_VERSION,
  }
  await setDoc(ref, payload, { merge: true })
}

export function subscribeUserState(
  uid: string,
  onData: (state: AppState | null, updatedAt: number | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const ref = userDocRef(uid)
  if (!ref) {
    onData(null, null)
    return () => undefined
  }
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null, null)
        return
      }
      const data = snap.data() as CloudDoc
      onData(data.state ?? null, data.updatedAt ?? null)
    },
    (err) => onError?.(err),
  )
}
