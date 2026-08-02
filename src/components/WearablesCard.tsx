import { useEffect, useRef, useState } from 'react'
import { parseAppleHealthExport, readAppleHealthFile } from '../lib/appleHealth'
import {
  buildWhoopAuthUrl,
  clearWhoopCredentials,
  loadWhoopCredentials,
  qualityFromPerformance,
  saveWhoopCredentials,
  sleepHoursFromWhoop,
  syncWhoopData,
  whoopRedirectUri,
} from '../lib/whoop'
import { useStore } from '../store/StoreContext'
import { uid } from '../utils/dates'
import type { RecoveryEntry, SleepEntry } from '../types'

export function WearablesCard() {
  const { mergeWearables } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [clientId, setClientId] = useState(
    () => loadWhoopCredentials()?.clientId ?? import.meta.env.VITE_WHOOP_CLIENT_ID ?? '',
  )
  const [clientSecret, setClientSecret] = useState(
    () =>
      loadWhoopCredentials()?.clientSecret ?? import.meta.env.VITE_WHOOP_CLIENT_SECRET ?? '',
  )
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const creds = loadWhoopCredentials()
  const whoopConnected = Boolean(creds?.accessToken || creds?.refreshToken)

  // Persist env-baked Whoop app keys into localStorage once so OAuth callback can read them
  useEffect(() => {
    if (!clientId || !clientSecret) return
    const existing = loadWhoopCredentials()
    if (existing?.clientId === clientId && existing?.clientSecret === clientSecret) return
    saveWhoopCredentials({
      ...(existing ?? { clientId: '', clientSecret: '' }),
      clientId,
      clientSecret,
    })
  }, [clientId, clientSecret])

  const saveCreds = () => {
    setError(null)
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Whoop Client ID and Secret required')
      return
    }
    saveWhoopCredentials({
      ...(loadWhoopCredentials() ?? { clientId: '', clientSecret: '' }),
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    })
    setMessage('Whoop app credentials saved on this device')
  }

  const connectWhoop = () => {
    setError(null)
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Save Client ID + Secret first')
      return
    }
    saveWhoopCredentials({
      ...(loadWhoopCredentials() ?? { clientId: '', clientSecret: '' }),
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    })
    const state = Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem('forge_whoop_oauth_state', state)
    window.location.href = buildWhoopAuthUrl(clientId.trim(), state)
  }

  const runWhoopSync = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const data = await syncWhoopData(14)
      const sleep: SleepEntry[] = []
      for (const s of data.sleeps) {
        const hours = sleepHoursFromWhoop(s)
        if (hours <= 0) continue
        sleep.push({
          id: uid('sleep'),
          date: s.end.slice(0, 10),
          hours,
          quality: qualityFromPerformance(s.score?.sleep_performance_percentage),
          source: 'whoop',
          performancePct: s.score?.sleep_performance_percentage,
        })
      }

      const recovery: RecoveryEntry[] = []
      for (const r of data.recoveries) {
        const cycle = data.cycles.find((c) => c.id === r.cycle_id)
        const date = (cycle?.start ?? r.created_at ?? '').slice(0, 10)
        if (!date || r.score?.recovery_score == null) continue
        recovery.push({
          id: uid('rec'),
          date,
          score: r.score.recovery_score,
          hrvMs: r.score.hrv_rmssd_milli,
          restingHr: r.score.resting_heart_rate,
          strain: cycle?.score?.strain,
          source: 'whoop',
        })
      }

      const weight =
        data.body?.weight_kilogram != null
          ? [
              {
                id: uid('weight'),
                date: new Date().toISOString().slice(0, 10),
                kg: Math.round(data.body.weight_kilogram * 10) / 10,
              },
            ]
          : undefined

      mergeWearables({ sleep, recovery, weight })
      setMessage(
        `Whoop synced · ${sleep.length} sleep · ${recovery.length} recovery` +
          (weight ? ' · weight' : ''),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Whoop sync failed')
    } finally {
      setBusy(false)
    }
  }

  const importApple = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const xml = await readAppleHealthFile(file)
      const parsed = parseAppleHealthExport(xml)
      mergeWearables({
        sleep: parsed.sleep,
        steps: parsed.steps,
        weight: parsed.weight,
      })
      setMessage(
        `Apple Health imported · ${parsed.counts.sleep} sleep · ${parsed.counts.steps} steps · ${parsed.counts.weight} weight`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="card">
      <div className="card-title">Wearables</div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
        Sync sleep / recovery / steps / weight from Whoop or Apple Health.
      </p>

      <div className="section-label" style={{ marginTop: 0 }}>
        Whoop
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
        1. Create an app at{' '}
        <a
          href="https://developer-dashboard.whoop.com"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--accent)' }}
        >
          developer-dashboard.whoop.com
        </a>
        <br />
        2. Set redirect URI to:
        <br />
        <code style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>{whoopRedirectUri()}</code>
        <br />
        3. Paste Client ID + Secret, connect, then Sync.
        <br />
        Best on <strong>Vercel</strong> (API proxy avoids browser CORS). Needs an active Whoop
        membership.
      </p>
      <div className="field">
        <label>Client ID</label>
        <input value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" />
      </div>
      <div className="field">
        <label>Client Secret</label>
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={saveCreds}>
          Save keys
        </button>
        <button type="button" className="btn btn-soft" onClick={connectWhoop}>
          {whoopConnected ? 'Reconnect' : 'Connect Whoop'}
        </button>
      </div>
      {whoopConnected && (
        <>
          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ marginTop: 8 }}
            disabled={busy}
            onClick={() => void runWhoopSync()}
          >
            {busy ? 'Syncing…' : 'Sync Whoop now'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ marginTop: 8 }}
            onClick={() => {
              clearWhoopCredentials()
              setMessage('Whoop disconnected')
            }}
          >
            Disconnect Whoop
          </button>
          {creds?.lastSyncAt && (
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
              Last sync {new Date(creds.lastSyncAt).toLocaleString()}
            </p>
          )}
        </>
      )}

      <div className="section-label">Apple Health</div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
        On iPhone: Health → profile → Export All Health Data → unzip → choose{' '}
        <code style={{ color: 'var(--accent)' }}>export.xml</code>. Live HealthKit access needs a
        native iOS shell (not available in a web PWA).
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".xml,text/xml"
        hidden
        onChange={(e) => void importApple(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        {busy ? 'Importing…' : 'Import export.xml'}
      </button>

      {message && (
        <p style={{ color: 'var(--green)', fontSize: 13, marginTop: 12 }}>{message}</p>
      )}
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{error}</p>}
    </div>
  )
}
