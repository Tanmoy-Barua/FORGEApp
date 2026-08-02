import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'

const SETUP_STEPS = [
  {
    title: 'Create a Firebase project',
    body: 'Open console.firebase.google.com → Add project → create a Web app.',
  },
  {
    title: 'Enable Email/Password auth',
    body: 'Build → Authentication → Sign-in method → Email/Password → Enable.',
  },
  {
    title: 'Create Firestore',
    body: 'Build → Firestore Database → Create database → start in production mode.',
  },
  {
    title: 'Paste security rules',
    body: 'Firestore → Rules → replace with the FORGE rules (shown below) → Publish.',
  },
  {
    title: 'Allow this site',
    body: 'Authentication → Settings → Authorized domains → add this site’s domain (and localhost).',
  },
]

const FORGE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/data/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`

export function CloudSyncCard() {
  const {
    cloudEnabled,
    cloudProjectId,
    user,
    syncStatus,
    syncError,
    connectCloud,
    disconnectCloud,
    signIn,
    signUp,
    signOut,
  } = useStore()

  const [showSetup, setShowSetup] = useState(!cloudEnabled)
  const [paste, setPaste] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const host = useMemo(() => {
    if (typeof window === 'undefined') return 'localhost'
    return window.location.hostname
  }, [])

  const statusLabel = (() => {
    switch (syncStatus) {
      case 'disabled':
        return 'Not connected'
      case 'signed_out':
        return 'Connected · signed out'
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
        : syncStatus === 'syncing' || syncStatus === 'signed_out'
          ? 'var(--accent)'
          : 'var(--text-muted)'

  const connect = async () => {
    setLocalError(null)
    setBusy(true)
    try {
      await connectCloud(paste)
      setPaste('')
      setShowSetup(false)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not connect')
    } finally {
      setBusy(false)
    }
  }

  const submitAuth = async () => {
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
      const raw = err instanceof Error ? err.message : 'Auth failed'
      let message = raw
      if (raw.includes('auth/unauthorized-domain')) {
        message = `Add "${host}" under Firebase → Authentication → Authorized domains, then try again.`
      } else if (raw.includes('auth/operation-not-allowed')) {
        message = 'Enable Email/Password in Firebase → Authentication → Sign-in method.'
      } else if (raw.includes('auth/invalid-api-key')) {
        message = 'API key looks wrong. Re-paste your Firebase web config.'
      } else if (raw.includes('auth/email-already-in-use')) {
        message = 'That email already has an account — switch to Sign in.'
      } else if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password')) {
        message = 'Wrong email or password.'
      } else if (raw.includes('permission-denied')) {
        message = 'Firestore blocked the write. Publish the FORGE security rules, then retry.'
      }
      setLocalError(message)
    } finally {
      setBusy(false)
    }
  }

  const copyRules = async () => {
    try {
      await navigator.clipboard.writeText(FORGE_RULES)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setLocalError('Could not copy — select the rules box manually.')
    }
  }

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div className="card-title" style={{ marginBottom: 0 }}>
          Cloud sync
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

      {cloudEnabled ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Project <strong style={{ color: 'var(--text)' }}>{cloudProjectId}</strong>
          {user ? ` · signed in as ${user.email}` : ' · sign in to sync phone + laptop'}
        </p>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Your data is only on this device right now. Connect Firebase to sync to the cloud.
        </p>
      )}

      {!cloudEnabled || showSetup ? (
        <>
          <div className="section-label" style={{ marginTop: 0 }}>
            Setup checklist
          </div>
          <ol style={{ margin: '0 0 14px', paddingLeft: 18, color: 'var(--text-muted)', fontSize: 13 }}>
            {SETUP_STEPS.map((step) => (
              <li key={step.title} style={{ marginBottom: 8 }}>
                <strong style={{ color: 'var(--text)' }}>{step.title}</strong>
                <div>{step.body}</div>
              </li>
            ))}
          </ol>

          <div className="field">
            <label>Firestore rules (copy → Publish)</label>
            <textarea
              readOnly
              value={FORGE_RULES}
              rows={8}
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, lineHeight: 1.35 }}
            />
          </div>
          <button type="button" className="btn btn-soft btn-block" onClick={() => void copyRules()}>
            {copied ? 'Copied ✓' : 'Copy rules'}
          </button>

          <div className="section-label">Paste Firebase web config</div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
            Project settings → Your apps → SDK setup → Config. Also add{' '}
            <code style={{ color: 'var(--accent)' }}>{host}</code> as an authorized domain.
          </p>
          <div className="field">
            <label>firebaseConfig</label>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={8}
              placeholder={`{\n  apiKey: "…",\n  authDomain: "….firebaseapp.com",\n  projectId: "…",\n  appId: "…"\n}`}
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
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
            disabled={busy || !paste.trim()}
            onClick={() => void connect()}
          >
            {busy ? 'Connecting…' : 'Connect Firebase'}
          </button>

          {cloudEnabled && (
            <button
              type="button"
              className="btn btn-ghost btn-block"
              style={{ marginTop: 8 }}
              onClick={() => setShowSetup(false)}
            >
              Back to sign in
            </button>
          )}
        </>
      ) : user ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Training data syncs live to Firestore. Progress photos stay private on this device.
          </p>
          {(localError || syncError) && (
            <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>
              {localError || syncError}
            </p>
          )}
          <button type="button" className="btn btn-ghost btn-block" onClick={() => void signOut()}>
            Sign out
          </button>
          <button
            type="button"
            className="btn btn-danger btn-block"
            style={{ marginTop: 8 }}
            onClick={() => {
              if (confirm('Disconnect Firebase from this device? Local data stays.')) {
                void disconnectCloud()
                setShowSetup(true)
              }
            }}
          >
            Disconnect cloud
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
            onClick={() => void submitAuth()}
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
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ marginTop: 8 }}
            onClick={() => {
              setShowSetup(true)
              setLocalError(null)
            }}
          >
            Change Firebase project
          </button>
        </>
      )}
    </div>
  )
}
