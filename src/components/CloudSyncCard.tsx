import { useState } from 'react'
import { useStore } from '../store/StoreContext'

export function CloudSyncCard() {
  const { cloudEnabled, user, syncStatus, syncError, signIn, signUp, signOut } = useStore()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const statusLabel = (() => {
    switch (syncStatus) {
      case 'disabled':
        return 'Cloud not configured'
      case 'signed_out':
        return 'Signed out'
      case 'syncing':
        return 'Syncing…'
      case 'synced':
        return 'Synced'
      case 'error':
        return 'Sync error'
      default:
        return syncStatus
    }
  })()

  const statusColor =
    syncStatus === 'synced'
      ? 'var(--green)'
      : syncStatus === 'error'
        ? 'var(--red)'
        : syncStatus === 'syncing'
          ? 'var(--accent)'
          : 'var(--text-muted)'

  const submit = async () => {
    setLocalError(null)
    if (!email.trim() || password.length < 6) {
      setLocalError('Email + password (6+ chars) required')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') await signIn(email, password)
      else await signUp(email, password)
      setPassword('')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Auth failed')
    } finally {
      setBusy(false)
    }
  }

  if (!cloudEnabled) {
    return (
      <div className="card">
        <div className="card-title">Cloud sync</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
          Firebase is not configured in this build. Add the{' '}
          <code style={{ color: 'var(--accent)' }}>VITE_FIREBASE_*</code> env vars on Vercel (or
          locally in <code>.env</code>), enable Email/Password auth + Firestore, then redeploy.
        </p>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Progress photos always stay on-device. Everything else syncs when you sign in.
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title">Cloud sync</div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {user ? user.email : 'Sign in to sync phone + laptop'}
        </div>
        <span
          className="tag"
          style={{
            background: 'transparent',
            border: `1px solid ${statusColor}`,
            color: statusColor,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {user ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Your training data syncs live to Firestore. Progress photos remain private on this
            device.
          </p>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => void signOut()}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {(localError || syncError) && (
            <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>
              {localError || syncError}
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in & sync' : 'Create account & sync'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ marginTop: 8 }}
            onClick={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
              setLocalError(null)
            }}
          >
            {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
          </button>
        </>
      )}
    </div>
  )
}
