import { useMemo, useState } from 'react'
import { HYROX_RACE_SEQUENCE, HYROX_STATIONS } from '../../data/hyrox'
import { useStore } from '../../store/StoreContext'
import { hyroxProjectedFinish } from '../../utils/calculations'
import { formatDuration, todayKey } from '../../utils/dates'
import { Segments } from '../../components/ui/Segments'
import { Sheet } from '../../components/ui/Sheet'
import type { HyroxStation } from '../../types'

type HyroxMode = 'stations' | 'sim' | 'readiness'

export function HyroxTab() {
  const store = useStore()
  const [mode, setMode] = useState<HyroxMode>('stations')
  const [logStation, setLogStation] = useState<HyroxStation | 'Run' | null>(null)
  const [seconds, setSeconds] = useState('180')
  const [simStep, setSimStep] = useState(0)
  const [splitInput, setSplitInput] = useState('')
  const [elapsed, setElapsed] = useState(0)

  const projection = useMemo(
    () => hyroxProjectedFinish(store.state.hyroxLogs),
    [store.state.hyroxLogs],
  )

  const activeSim = store.state.simulations.find((s) => s.id === store.state.activeSimId)

  const bestFor = (station: string) => {
    const times = store.state.hyroxLogs
      .filter((l) => l.station === station && l.metricType === 'time' && !l.simId)
      .map((l) => l.value)
      .sort((a, b) => a - b)
    return times[0] ?? null
  }

  const saveStationLog = () => {
    if (!logStation) return
    const idx = HYROX_STATIONS.indexOf(logStation as HyroxStation)
    store.addHyroxLog({
      date: todayKey(),
      station: logStation,
      stationIndex: idx >= 0 ? idx : -1,
      metricType: 'time',
      value: parseInt(seconds, 10) || 0,
      unit: 'sec',
      simId: null,
    })
    setLogStation(null)
  }

  const startSim = () => {
    store.startSim()
    setSimStep(0)
    setElapsed(0)
    setSplitInput('')
    setMode('sim')
  }

  const logSplit = () => {
    if (!store.state.activeSimId) return
    const leg = HYROX_RACE_SEQUENCE[simStep]
    const value = parseInt(splitInput, 10) || 0
    store.addHyroxLog({
      date: todayKey(),
      station: leg.name,
      stationIndex: leg.index,
      metricType: 'time',
      value,
      unit: 'sec',
      simId: store.state.activeSimId,
    })
    setElapsed((e) => e + value)
    setSplitInput('')
    if (simStep >= HYROX_RACE_SEQUENCE.length - 1) {
      store.finishSim('Full simulation')
      setSimStep(0)
    } else {
      setSimStep((s) => s + 1)
    }
  }

  const simSplits = store.state.hyroxLogs.filter((l) => l.simId === store.state.activeSimId)
  const lastFinishedSim = [...store.state.simulations]
    .filter((s) => s.finishedAt)
    .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))[0]

  return (
    <div>
      <Segments
        options={[
          { value: 'stations', label: 'Stations' },
          { value: 'sim', label: 'Simulate' },
          { value: 'readiness', label: 'Ready' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === 'stations' && (
        <>
          <p className="page-sub" style={{ marginTop: 0 }}>
            Log training times for each official station + 1 km runs.
          </p>
          <div className="station-grid">
            <button type="button" className="station-row" onClick={() => setLogStation('Run')}>
              <div>
                <div className="name">1 km Run</div>
                <div className="meta">Between every station</div>
              </div>
              <div className="num num-sm">
                {bestFor('Run') ? formatDuration(bestFor('Run')!) : '—'}
              </div>
            </button>
            {HYROX_STATIONS.map((station) => (
              <button
                key={station}
                type="button"
                className="station-row"
                onClick={() => {
                  setLogStation(station)
                  const best = bestFor(station)
                  if (best) setSeconds(String(best))
                }}
              >
                <div>
                  <div className="name">{station}</div>
                  <div className="meta">Tap to log</div>
                </div>
                <div className="num num-sm">
                  {bestFor(station) ? formatDuration(bestFor(station)!) : '—'}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {mode === 'sim' && (
        <>
          {!activeSim ? (
            <div className="card">
              <div className="card-title">Saturday simulation</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 14 }}>
                Race-day clock. Walk through Run → Station × 8 and capture every split.
              </p>
              <button type="button" className="btn btn-primary btn-block" onClick={startSim}>
                Start simulation
              </button>
              {lastFinishedSim?.totalSeconds != null && (
                <p style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: 13 }}>
                  Last sim finish:{' '}
                  <span className="num" style={{ color: 'var(--accent)' }}>
                    {formatDuration(lastFinishedSim.totalSeconds)}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="card-title">Live simulation</div>
              <div className="num num-xl" style={{ color: 'var(--accent)', marginBottom: 8 }}>
                {formatDuration(elapsed)}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
                Leg {simStep + 1} / {HYROX_RACE_SEQUENCE.length}
              </p>

              {HYROX_RACE_SEQUENCE.map((leg, i) => {
                const done = i < simStep || simSplits.some((s) => s.stationIndex === leg.index)
                const active = i === simStep
                const split = simSplits.find((s) => s.stationIndex === leg.index)
                return (
                  <div
                    key={`${leg.name}-${leg.index}`}
                    className={`sim-leg ${active ? 'active' : ''} ${done && !active ? 'done' : ''}`}
                  >
                    <span className="sim-idx">{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{leg.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{leg.hint}</div>
                    </div>
                    <div className="num num-sm">
                      {split ? formatDuration(split.value) : active ? '…' : '—'}
                    </div>
                  </div>
                )
              })}

              <div className="field" style={{ marginTop: 12 }}>
                <label>
                  Split seconds — {HYROX_RACE_SEQUENCE[simStep]?.name}
                </label>
                <input
                  value={splitInput}
                  onChange={(e) => setSplitInput(e.target.value)}
                  inputMode="numeric"
                  autoFocus
                  placeholder="e.g. 240"
                />
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={!splitInput}
                onClick={logSplit}
              >
                {simStep >= HYROX_RACE_SEQUENCE.length - 1 ? 'Finish race' : 'Log split →'}
              </button>
              <button
                type="button"
                className="btn btn-danger btn-block"
                style={{ marginTop: 8 }}
                onClick={() => {
                  store.finishSim('Abandoned')
                  setSimStep(0)
                  setElapsed(0)
                }}
              >
                End early
              </button>
            </div>
          )}
        </>
      )}

      {mode === 'readiness' && (
        <>
          <div className="card">
            <div className="card-title">Projected finish</div>
            <div className="num num-xl" style={{ color: 'var(--accent)' }}>
              {formatDuration(projection.totalSeconds)}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
              Based on your recent station + run averages. Improves as you log more.
            </p>
          </div>

          {projection.weakest && (
            <div className="weakest-flag">
              Bottleneck: <strong>{projection.weakest.station}</strong> —{' '}
              {formatDuration(Math.round(projection.weakest.seconds))} (
              {Math.round((projection.weakest.vsBaseline - 1) * 100)}% vs baseline). Make this your
              focus block.
            </div>
          )}

          <div className="card">
            <div className="card-title">Station readiness</div>
            <div className="station-grid">
              {['Run', ...HYROX_STATIONS].map((station) => {
                const best = bestFor(station)
                return (
                  <div key={station} className="station-row">
                    <div className="name" style={{ fontSize: 16 }}>
                      {station === 'Run' ? '1 km Run' : station}
                    </div>
                    <div className="num num-sm">{best ? formatDuration(best) : '—'}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      <Sheet
        open={!!logStation}
        onClose={() => setLogStation(null)}
        title={logStation ?? ''}
        subtitle="Time in seconds"
      >
        <div className="field">
          <label>Seconds</label>
          <input
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            inputMode="numeric"
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[120, 180, 240, 300].map((s) => (
            <button
              key={s}
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setSeconds(String(s))}
            >
              {formatDuration(s)}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={saveStationLog}>
          Save {seconds ? formatDuration(parseInt(seconds, 10) || 0) : ''}
        </button>
      </Sheet>
    </div>
  )
}
