import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CloudSyncCard } from '../components/CloudSyncCard'
import { useStore } from '../store/StoreContext'
import { exportCsv, exportStateJson } from '../store/storage'
import type { AppState } from '../types'

export function Profile() {
  const store = useStore()
  const { profile } = store.state
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const patch = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setSaved(false)
  }

  const save = () => {
    store.updateProfile({
      ...draft,
      startWeight: Number(draft.startWeight),
      targetWeight: Number(draft.targetWeight),
      proteinTarget: Number(draft.proteinTarget),
      carbsTarget: Number(draft.carbsTarget),
      fatTarget: Number(draft.fatTarget),
      calorieTarget: Number(draft.calorieTarget),
      waterTargetMl: Number(draft.waterTargetMl),
      stepsTarget: Number(draft.stepsTarget),
      sleepTargetHours: Number(draft.sleepTargetHours),
    })
    setSaved(true)
  }

  const download = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as AppState
      if (!parsed.profile || !parsed.plan) throw new Error('Invalid FORGE backup')
      store.importState(parsed)
      setDraft(parsed.profile)
      setSaved(true)
    } catch {
      alert('Could not import that file. Use a FORGE JSON export.')
    }
  }

  return (
    <div className="page">
      <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13, display: 'inline-block', marginBottom: 12 }}>
        ← Home
      </Link>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">Targets, race, cloud sync, export</p>

      <CloudSyncCard />

      <div className="card">
        <div className="card-title">Athlete</div>
        <div className="field">
          <label>Name</label>
          <input value={draft.name} onChange={(e) => patch('name', e.target.value)} />
        </div>
        <div className="field-row-2">
          <div className="field">
            <label>Start weight</label>
            <input
              type="number"
              value={draft.startWeight}
              onChange={(e) => patch('startWeight', Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Target weight</label>
            <input
              type="number"
              value={draft.targetWeight}
              onChange={(e) => patch('targetWeight', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Race</div>
        <div className="field">
          <label>Race name</label>
          <input value={draft.raceName} onChange={(e) => patch('raceName', e.target.value)} />
        </div>
        <div className="field-row-2">
          <div className="field">
            <label>Race date</label>
            <input
              type="date"
              value={draft.raceDate}
              onChange={(e) => patch('raceDate', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Program start</label>
            <input
              type="date"
              value={draft.programStart}
              onChange={(e) => patch('programStart', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Daily targets</div>
        <div className="field-row-2">
          <div className="field">
            <label>Protein (g)</label>
            <input
              type="number"
              value={draft.proteinTarget}
              onChange={(e) => patch('proteinTarget', Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Carbs (g)</label>
            <input
              type="number"
              value={draft.carbsTarget}
              onChange={(e) => patch('carbsTarget', Number(e.target.value))}
            />
          </div>
        </div>
        <div className="field-row-2">
          <div className="field">
            <label>Fat (g)</label>
            <input
              type="number"
              value={draft.fatTarget}
              onChange={(e) => patch('fatTarget', Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Calories</label>
            <input
              type="number"
              value={draft.calorieTarget}
              onChange={(e) => patch('calorieTarget', Number(e.target.value))}
            />
          </div>
        </div>
        <div className="field-row-2">
          <div className="field">
            <label>Water (mL)</label>
            <input
              type="number"
              value={draft.waterTargetMl}
              onChange={(e) => patch('waterTargetMl', Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Steps</label>
            <input
              type="number"
              value={draft.stepsTarget}
              onChange={(e) => patch('stepsTarget', Number(e.target.value))}
            />
          </div>
        </div>
        <div className="field">
          <label>Sleep (hours)</label>
          <input
            type="number"
            step="0.5"
            value={draft.sleepTargetHours}
            onChange={(e) => patch('sleepTargetHours', Number(e.target.value))}
          />
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={save}>
          {saved ? 'Saved ✓' : 'Save settings'}
        </button>
      </div>

      <div className="card">
        <div className="card-title">Export & backup</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          One-tap export so your data is never trapped.
        </p>
        <button
          type="button"
          className="btn btn-soft btn-block"
          onClick={() =>
            download('forge-backup.json', exportStateJson(store.state), 'application/json')
          }
        >
          Export JSON
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ marginTop: 8 }}
          onClick={() => download('forge-export.csv', exportCsv(store.state), 'text/csv')}
        >
          Export CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => onImport(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ marginTop: 8 }}
          onClick={() => fileRef.current?.click()}
        >
          Import JSON backup
        </button>
      </div>

      <div className="card">
        <div className="card-title">Danger zone</div>
        <button
          type="button"
          className="btn btn-danger btn-block"
          onClick={() => {
            if (confirm('Reset all FORGE data on this device?')) store.resetAll()
          }}
        >
          Reset all data
        </button>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, marginTop: 24 }}>
        FORGE · Train for the race. Track for life.
      </p>
    </div>
  )
}
