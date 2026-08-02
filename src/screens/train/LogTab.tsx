import { useEffect, useMemo, useState } from 'react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EXERCISE_LIBRARY } from '../../data/exercises'
import { useStore } from '../../store/StoreContext'
import { lastSetsForExercise, runPace, workoutVolume } from '../../utils/calculations'
import { formatDuration, formatPace, todayKey } from '../../utils/dates'
import { Segments } from '../../components/ui/Segments'
import { Sheet } from '../../components/ui/Sheet'

type LogMode = 'strength' | 'run'

export function LogTab() {
  const store = useStore()
  const [mode, setMode] = useState<LogMode>('strength')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [activeExercises, setActiveExercises] = useState<string[]>([])
  const [draft, setDraft] = useState<Record<string, { weight: string; reps: string; rpe: string }>>({})
  const [restSeconds, setRestSeconds] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [summary, setSummary] = useState<{ volume: number; duration: number; prs: string[] } | null>(
    null,
  )

  const [distance, setDistance] = useState('5')
  const [minutes, setMinutes] = useState('35')
  const [seconds, setSeconds] = useState('0')
  const [intervals, setIntervals] = useState(true)
  const [effort, setEffort] = useState('5')
  const [routeNote, setRouteNote] = useState('')
  const [runSaved, setRunSaved] = useState(false)

  const activeWorkout = store.state.workouts.find((w) => w.id === store.state.activeWorkoutId)

  useEffect(() => {
    if (!activeWorkout) return
    const fromSets = [...new Set(activeWorkout.sets.map((s) => s.exercise))]
    setActiveExercises((prev) => Array.from(new Set([...prev, ...fromSets])))
    if (!startedAt) setStartedAt(Date.now())
  }, [activeWorkout, startedAt])

  useEffect(() => {
    if (restSeconds <= 0) return
    const t = window.setInterval(() => setRestSeconds((s) => s - 1), 1000)
    return () => window.clearInterval(t)
  }, [restSeconds])

  const pacePreview = useMemo(() => {
    const d = parseFloat(distance) || 0
    const totalSec = (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0)
    if (d <= 0 || totalSec <= 0) return '—'
    return formatPace(totalSec / d)
  }, [distance, minutes, seconds])

  const paceChart = [...store.state.runs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
    .map((r) => ({
      date: r.date.slice(5),
      pace: Math.round(runPace(r)),
    }))

  const beginSession = () => {
    store.startWorkout('strength')
    setStartedAt(Date.now())
    setSummary(null)
  }

  const addExercise = (name: string) => {
    if (!store.state.activeWorkoutId) beginSession()
    setActiveExercises((prev) => (prev.includes(name) ? prev : [...prev, name]))
    const last = lastSetsForExercise(store.state.workouts, name)
    const lastSet = last?.sets[last.sets.length - 1]
    setDraft((d) => ({
      ...d,
      [name]: {
        weight: String(lastSet?.weight ?? 20),
        reps: String(lastSet?.reps ?? 10),
        rpe: String(lastSet?.rpe ?? 7),
      },
    }))
    setPickerOpen(false)
  }

  const doLogSet = (exercise: string) => {
    let wid = store.state.activeWorkoutId
    if (!wid) wid = store.startWorkout('strength')
    const d = draft[exercise] ?? { weight: '20', reps: '10', rpe: '7' }
    store.logSet(
      wid,
      exercise,
      parseFloat(d.weight) || 0,
      parseInt(d.reps, 10) || 0,
      parseFloat(d.rpe) || 7,
    )
    setRestSeconds(90)
  }

  const finish = () => {
    const wid = store.state.activeWorkoutId
    if (!wid || !activeWorkout) return
    const duration = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : 0
    const volume = workoutVolume({ ...activeWorkout })
    const prs: string[] = []
    for (const ex of activeExercises) {
      const sets = activeWorkout.sets.filter((s) => s.exercise === ex)
      const best = Math.max(0, ...sets.map((s) => s.weight * s.reps))
      const prior = lastSetsForExercise(
        store.state.workouts.filter((w) => w.id !== wid),
        ex,
      )
      const priorBest = prior ? Math.max(0, ...prior.sets.map((s) => s.weight * s.reps)) : 0
      if (best > priorBest && best > 0) prs.push(ex)
    }
    store.finishWorkout(wid, duration)
    setSummary({ volume, duration, prs })
    setActiveExercises([])
    setStartedAt(null)
    setRestSeconds(0)
  }

  const saveRun = () => {
    const d = parseFloat(distance) || 0
    const totalSec = (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0)
    store.addRun({
      date: todayKey(),
      distanceKm: d,
      timeSeconds: totalSec,
      intervals,
      effort: parseInt(effort, 10) || 5,
      routeNote,
    })
    const id = store.startWorkout('run')
    store.finishWorkout(id, Math.round(totalSec / 60), routeNote || 'Run')
    setRouteNote('')
    setRunSaved(true)
    window.setTimeout(() => setRunSaved(false), 2000)
  }

  return (
    <div>
      <Segments
        options={[
          { value: 'strength', label: 'Strength' },
          { value: 'run', label: 'Running' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === 'strength' && (
        <>
          {!store.state.activeWorkoutId && !summary && (
            <div className="card">
              <div className="card-title">Session logger</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 14 }}>
                Auto-fills last session. Log weight · reps · RPE. Repeat last set with one tap.
              </p>
              <button type="button" className="btn btn-primary btn-block" onClick={beginSession}>
                Start strength session
              </button>
            </div>
          )}

          {summary && (
            <div className="card" style={{ borderColor: 'rgba(215,255,0,0.3)' }}>
              <div className="card-title">Session summary</div>
              <div className="stats-row">
                <div className="stat-chip">
                  <div className="label">Volume</div>
                  <div className="num num-sm">{Math.round(summary.volume)}</div>
                </div>
                <div className="stat-chip">
                  <div className="label">Duration</div>
                  <div className="num num-sm">{summary.duration}m</div>
                </div>
                <div className="stat-chip">
                  <div className="label">PRs</div>
                  <div className="num num-sm">{summary.prs.length}</div>
                </div>
              </div>
              {summary.prs.length > 0 && (
                <p style={{ marginTop: 12, color: 'var(--accent)', fontSize: 13 }}>
                  New PRs: {summary.prs.join(', ')}
                </p>
              )}
              <button
                type="button"
                className="btn btn-soft btn-block"
                style={{ marginTop: 14 }}
                onClick={() => {
                  setSummary(null)
                  beginSession()
                }}
              >
                Start another
              </button>
            </div>
          )}

          {store.state.activeWorkoutId && activeWorkout && (
            <>
              {restSeconds > 0 && (
                <div className="rest-timer">
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Rest timer
                  </div>
                  <div className="num num-lg">{formatDuration(restSeconds)}</div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ marginTop: 8 }}
                    onClick={() => setRestSeconds(0)}
                  >
                    Skip
                  </button>
                </div>
              )}

              {activeExercises.map((ex) => {
                const sets = activeWorkout.sets.filter((s) => s.exercise === ex)
                const last = lastSetsForExercise(
                  store.state.workouts.filter((w) => w.id !== activeWorkout.id),
                  ex,
                )
                const d = draft[ex] ?? { weight: '20', reps: '10', rpe: '7' }
                return (
                  <div key={ex} className="exercise-card">
                    <h3>{ex}</h3>
                    <div className="last-hint">
                      {last
                        ? `Last time: ${last.sets.length}×${last.sets[0]?.reps ?? '—'} @ ${last.sets[0]?.weight ?? '—'}kg`
                        : 'First time logging this lift'}
                    </div>
                    {sets.map((s) => (
                      <div key={s.id} className="set-row">
                        <span>{s.setNumber}</span>
                        <span>{s.weight} kg</span>
                        <span>{s.reps} reps</span>
                        <span>RPE {s.rpe}</span>
                      </div>
                    ))}
                    <div className="field-row" style={{ marginTop: 8 }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>kg</label>
                        <input
                          value={d.weight}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [ex]: { ...d, weight: e.target.value } }))
                          }
                          inputMode="decimal"
                        />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>reps</label>
                        <input
                          value={d.reps}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [ex]: { ...d, reps: e.target.value } }))
                          }
                          inputMode="numeric"
                        />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>RPE</label>
                        <input
                          value={d.rpe}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [ex]: { ...d, rpe: e.target.value } }))
                          }
                          inputMode="decimal"
                        />
                      </div>
                    </div>
                    <div className="set-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={() => doLogSet(ex)}
                      >
                        Log set
                      </button>
                      <button
                        type="button"
                        className="btn btn-soft"
                        disabled={sets.length === 0}
                        onClick={() => {
                          store.repeatLastSet(activeWorkout.id, ex)
                          setRestSeconds(90)
                        }}
                      >
                        Repeat
                      </button>
                    </div>
                  </div>
                )
              })}

              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => setPickerOpen(true)}
              >
                + Add exercise
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    store.cancelWorkout(activeWorkout.id)
                    setActiveExercises([])
                    setStartedAt(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={activeWorkout.sets.length === 0}
                  onClick={finish}
                >
                  Finish
                </button>
              </div>
            </>
          )}

          <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Exercise library">
            {EXERCISE_LIBRARY.map((name) => (
              <button
                key={name}
                type="button"
                className="library-item"
                onClick={() => addExercise(name)}
              >
                {name}
              </button>
            ))}
          </Sheet>
        </>
      )}

      {mode === 'run' && (
        <>
          <div className="card">
            <div className="card-title">Running log</div>
            <div className="field-row-2">
              <div className="field">
                <label>Distance (km)</label>
                <input
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="field">
                <label>Effort (1–10)</label>
                <input value={effort} onChange={(e) => setEffort(e.target.value)} inputMode="numeric" />
              </div>
            </div>
            <div className="field-row-2">
              <div className="field">
                <label>Minutes</label>
                <input
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="field">
                <label>Seconds</label>
                <input
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pace / km</div>
                <div className="num num-md">{pacePreview}</div>
              </div>
              <button
                type="button"
                className={`btn btn-sm ${intervals ? 'btn-soft' : 'btn-ghost'}`}
                onClick={() => setIntervals((v) => !v)}
              >
                {intervals ? 'Run/walk ON' : 'Run/walk OFF'}
              </button>
            </div>
            <div className="field">
              <label>Route note</label>
              <input
                value={routeNote}
                onChange={(e) => setRouteNote(e.target.value)}
                placeholder="Neighborhood loop"
              />
            </div>
            <button type="button" className="btn btn-primary btn-block" onClick={saveRun}>
              {runSaved ? 'Saved ✓' : 'Save run'}
            </button>
          </div>

          <div className="card">
            <div className="card-title">Pace trend</div>
            {paceChart.length > 1 ? (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={paceChart}>
                    <XAxis dataKey="date" stroke="#5c5c68" fontSize={11} />
                    <YAxis
                      stroke="#5c5c68"
                      fontSize={11}
                      tickFormatter={(v) => formatPace(Number(v))}
                      width={42}
                      reversed
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#16161A',
                        border: '1px solid #26262e',
                        borderRadius: 10,
                      }}
                      formatter={(v) => [formatPace(Number(v)), 'pace']}
                    />
                    <Line
                      type="monotone"
                      dataKey="pace"
                      stroke="#D7FF00"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty">Log a few runs to see pace trend.</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
