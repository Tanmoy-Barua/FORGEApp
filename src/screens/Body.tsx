import { useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Segments } from '../components/ui/Segments'
import { useStore } from '../store/StoreContext'
import { latestWeight, movingAverage, weightTrend } from '../utils/calculations'
import type { MeasurementType, SleepQuality } from '../types'

type BodyTab = 'weight' | 'metrics' | 'sleep' | 'photos'

const MEASUREMENTS: { type: MeasurementType; label: string }[] = [
  { type: 'waist', label: 'Waist' },
  { type: 'hips', label: 'Hips' },
  { type: 'chest', label: 'Chest' },
  { type: 'arms', label: 'Arms' },
  { type: 'thighs', label: 'Thighs' },
]

export function Body() {
  const store = useStore()
  const [tab, setTab] = useState<BodyTab>('weight')
  const [kg, setKg] = useState('')
  const [measType, setMeasType] = useState<MeasurementType>('waist')
  const [measValue, setMeasValue] = useState('')
  const [lean, setLean] = useState('')
  const [bf, setBf] = useState('')
  const [sleepHours, setSleepHours] = useState('8')
  const [sleepQuality, setSleepQuality] = useState<SleepQuality>('good')
  const fileRef = useRef<HTMLInputElement>(null)

  const weight = latestWeight(store.state.weightEntries)
  const trend = weightTrend(store.state.weightEntries)
  const chart = movingAverage(store.state.weightEntries)
  const trendArrow = trend === 'down' ? '↓' : trend === 'up' ? '↑' : '→'

  const sleepAvg = useMemo(() => {
    const recent = [...store.state.sleepEntries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7)
    if (!recent.length) return null
    return recent.reduce((s, e) => s + e.hours, 0) / recent.length
  }, [store.state.sleepEntries])

  const onPhoto = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') store.addPhoto(reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="page">
      <h1 className="page-title">Body</h1>
      <p className="page-sub">Weight, composition, sleep, private photos</p>

      <Segments
        options={[
          { value: 'weight', label: 'Weight' },
          { value: 'metrics', label: 'Metrics' },
          { value: 'sleep', label: 'Sleep' },
          { value: 'photos', label: 'Photos' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'weight' && (
        <>
          <div className="card">
            <div className="card-title">Current</div>
            <div className={`num num-xl trend-${trend}`}>
              {weight ? weight.kg.toFixed(1) : '—'}
              <span className="unit">kg {trendArrow}</span>
            </div>
            <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 13 }}>
              {store.state.profile.startWeight} → {store.state.profile.targetWeight} kg target
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label>Log weight (kg)</label>
              <input
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                inputMode="decimal"
                placeholder={weight ? String(weight.kg) : '100.0'}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!kg}
              onClick={() => {
                store.addWeight(parseFloat(kg))
                setKg('')
              }}
            >
              Save weight
            </button>
          </div>

          <div className="card">
            <div className="card-title">7-day moving average</div>
            {chart.length > 1 ? (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart}>
                    <defs>
                      <linearGradient id="bodyW" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D7FF00" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#D7FF00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
                    <Tooltip
                      contentStyle={{
                        background: '#16161A',
                        border: '1px solid #26262e',
                        borderRadius: 10,
                      }}
                      formatter={(v) => [`${v} kg`, 'avg']}
                    />
                    <Area
                      type="monotone"
                      dataKey="avg"
                      stroke="#D7FF00"
                      fill="url(#bodyW)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty">Need a few weigh-ins for the average.</div>
            )}
          </div>
        </>
      )}

      {tab === 'metrics' && (
        <>
          <div className="card">
            <div className="card-title">Measurements</div>
            <div className="field">
              <label>Type</label>
              <select
                value={measType}
                onChange={(e) => setMeasType(e.target.value as MeasurementType)}
              >
                {MEASUREMENTS.map((m) => (
                  <option key={m.type} value={m.type}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>cm</label>
              <input
                value={measValue}
                onChange={(e) => setMeasValue(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!measValue}
              onClick={() => {
                store.addMeasurement(measType, parseFloat(measValue))
                setMeasValue('')
              }}
            >
              Save measurement
            </button>
          </div>

          <div className="card">
            <div className="card-title">Latest</div>
            {MEASUREMENTS.map((m) => {
              const latest = [...store.state.measurements]
                .filter((x) => x.type === m.type)
                .sort((a, b) => b.date.localeCompare(a.date))[0]
              return (
                <div key={m.type} className="food-row">
                  <span style={{ fontWeight: 600 }}>{m.label}</span>
                  <span className="num num-sm">{latest ? `${latest.valueCm} cm` : '—'}</span>
                </div>
              )
            })}
          </div>

          <div className="card">
            <div className="card-title">Body composition</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              From DEXA or estimates — track muscle kept while fat drops.
            </p>
            <div className="field-row-2">
              <div className="field">
                <label>Lean mass kg</label>
                <input value={lean} onChange={(e) => setLean(e.target.value)} inputMode="decimal" />
              </div>
              <div className="field">
                <label>Body fat %</label>
                <input value={bf} onChange={(e) => setBf(e.target.value)} inputMode="decimal" />
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!lean || !bf}
              onClick={() => {
                store.addBodyComp(parseFloat(lean), parseFloat(bf))
                setLean('')
                setBf('')
              }}
            >
              Save composition
            </button>
            {store.state.bodyComp[0] && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                Latest:{' '}
                {[...store.state.bodyComp].sort((a, b) => b.date.localeCompare(a.date))[0].leanMassKg}{' '}
                kg lean ·{' '}
                {[...store.state.bodyComp].sort((a, b) => b.date.localeCompare(a.date))[0].bodyFatPct}
                % BF
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'sleep' && (
        <>
          <div className="card">
            <div className="card-title">Last night</div>
            <div className="num num-xl">
              {store.state.sleepEntries.find((s) => s.date === new Date().toISOString().slice(0, 10))
                ?.hours ?? '—'}
              <span className="unit">hours</span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
              Target {store.state.profile.sleepTargetHours}h · 7-day avg{' '}
              {sleepAvg ? `${sleepAvg.toFixed(1)}h` : '—'}
            </div>
            <div className="field-row-2" style={{ marginTop: 16 }}>
              <div className="field">
                <label>Hours</label>
                <input
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="field">
                <label>Quality</label>
                <select
                  value={sleepQuality}
                  onChange={(e) => setSleepQuality(e.target.value as SleepQuality)}
                >
                  <option value="poor">Poor</option>
                  <option value="ok">OK</option>
                  <option value="good">Good</option>
                  <option value="great">Great</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => store.addSleep(parseFloat(sleepHours), sleepQuality)}
            >
              Save sleep
            </button>
          </div>

          <div className="card">
            <div className="card-title">Recent</div>
            {[...store.state.sleepEntries]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 7)
              .map((s) => (
                <div key={s.id} className="food-row">
                  <span>{s.date}</span>
                  <span className="num num-sm">
                    {s.hours}h · {s.quality}
                  </span>
                </div>
              ))}
            {store.state.sleepEntries.length === 0 && (
              <div className="empty">No sleep logged yet.</div>
            )}
          </div>
        </>
      )}

      {tab === 'photos' && (
        <div className="card">
          <div className="card-title">Progress photos</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            Private & optional. Stored on this device only — never shared. Best as a monthly
            comparison.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => fileRef.current?.click()}
          >
            Add photo
          </button>
          {store.state.progressPhotos.length > 0 ? (
            <div className="photo-grid" style={{ marginTop: 16 }}>
              {[...store.state.progressPhotos]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((p) => (
                  <div key={p.id} style={{ position: 'relative' }}>
                    <img src={p.localDataUrl} alt={`Progress ${p.date}`} />
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        marginTop: 4,
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{p.date}</span>
                      <button type="button" onClick={() => store.removePhoto(p.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="empty">No photos yet.</div>
          )}
        </div>
      )}
    </div>
  )
}
