import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  buildWhoopAuthUrl,
  formatDurationMs,
  formatSport,
  kjToKcal,
  loadWhoopCache,
  loadWhoopCredentials,
  milliToHours,
  qualityFromPerformance,
  recoveryZone,
  saveWhoopCredentials,
  sleepHoursFromWhoop,
  syncWhoopData,
  type WhoopCache,
} from '../lib/whoop'
import { useStore } from '../store/StoreContext'
import { uid } from '../utils/dates'
import type { RecoveryEntry, SleepEntry } from '../types'

function ScoreRing({
  value,
  max = 100,
  label,
  color,
  sub,
}: {
  value: number | null
  max?: number
  label: string
  color: string
  sub?: string
}) {
  const size = 132
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio = value == null || max <= 0 ? 0 : Math.min(value / max, 1)
  const offset = c * (1 - ratio)

  return (
    <div className="whoop-ring">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="whoop-ring-center">
        <div className="num" style={{ fontSize: 36, color }}>
          {value == null ? '—' : Math.round(value * 10) / 10}
        </div>
        <div className="whoop-ring-label">{label}</div>
        {sub ? <div className="whoop-ring-sub">{sub}</div> : null}
      </div>
    </div>
  )
}

function StageBar({
  label,
  hours,
  total,
  color,
}: {
  label: string
  hours: number
  total: number
  color: string
}) {
  const pct = total > 0 ? (hours / total) * 100 : 0
  return (
    <div className="whoop-stage">
      <div className="whoop-stage-meta">
        <span>{label}</span>
        <span className="num" style={{ fontSize: 16 }}>
          {hours.toFixed(1)}h
        </span>
      </div>
      <div className="whoop-stage-track">
        <div className="whoop-stage-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export function Whoop() {
  const { mergeWearables } = useStore()
  const [cache, setCache] = useState<WhoopCache | null>(() => loadWhoopCache())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const creds = loadWhoopCredentials()
  const connected = Boolean(creds?.accessToken || creds?.refreshToken)

  const latestRecovery = cache?.recoveries?.[0]
  const latestCycle = useMemo(() => {
    if (!cache?.cycles?.length) return null
    if (latestRecovery) {
      return cache.cycles.find((c) => c.id === latestRecovery.cycle_id) ?? cache.cycles[0]
    }
    return cache.cycles[0]
  }, [cache, latestRecovery])

  const latestSleep = useMemo(() => {
    if (!cache?.sleeps?.length) return null
    if (latestRecovery?.sleep_id) {
      return cache.sleeps.find((s) => s.id === latestRecovery.sleep_id) ?? cache.sleeps[0]
    }
    return cache.sleeps.filter((s) => !s.nap)[0] ?? cache.sleeps[0]
  }, [cache, latestRecovery])

  const zone = recoveryZone(latestRecovery?.score?.recovery_score)
  const zoneColor =
    zone === 'green' ? 'var(--green)' : zone === 'yellow' ? 'var(--amber)' : zone === 'red' ? 'var(--red)' : 'var(--accent)'

  const stages = latestSleep?.score?.stage_summary
  const deepH = milliToHours(stages?.total_slow_wave_sleep_time_milli)
  const remH = milliToHours(stages?.total_rem_sleep_time_milli)
  const lightH = milliToHours(stages?.total_light_sleep_time_milli)
  const awakeH = milliToHours(stages?.total_awake_time_milli)
  const asleepTotal = deepH + remH + lightH

  const trend = useMemo(() => {
    if (!cache) return []
    const byDate = new Map<string, { date: string; recovery?: number; strain?: number; sleep?: number }>()
    for (const c of cache.cycles) {
      const date = c.start.slice(5, 10)
      const row = byDate.get(date) ?? { date }
      row.strain = c.score?.strain
      byDate.set(date, row)
    }
    for (const r of cache.recoveries) {
      const cycle = cache.cycles.find((c) => c.id === r.cycle_id)
      const date = (cycle?.start ?? r.created_at ?? '').slice(5, 10)
      if (!date) continue
      const row = byDate.get(date) ?? { date }
      row.recovery = r.score?.recovery_score
      byDate.set(date, row)
    }
    for (const s of cache.sleeps) {
      if (s.nap) continue
      const date = s.end.slice(5, 10)
      const row = byDate.get(date) ?? { date }
      row.sleep = s.score?.sleep_performance_percentage ?? sleepHoursFromWhoop(s) * 10
      byDate.set(date, row)
    }
    return [...byDate.values()].reverse().slice(-14)
  }, [cache])

  const connect = () => {
    const c = loadWhoopCredentials()
    if (!c?.clientId || !c.clientSecret) {
      setError('Add Whoop Client ID/Secret in Settings first')
      return
    }
    saveWhoopCredentials(c)
    const state = Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem('forge_whoop_oauth_state', state)
    window.location.href = buildWhoopAuthUrl(c.clientId, state)
  }

  const sync = async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await syncWhoopData(30)
      setCache(data)

      const sleep: SleepEntry[] = []
      for (const s of data.sleeps) {
        if (s.nap) continue
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setBusy(false)
    }
  }

  const name = cache?.profile
    ? [cache.profile.first_name, cache.profile.last_name].filter(Boolean).join(' ')
    : 'Athlete'

  return (
    <div className="page whoop-page">
      <div className="whoop-hero">
        <div className="whoop-hero-top">
          <div>
            <div className="whoop-kicker">FORGE</div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>
              {name || 'Dashboard'}
            </h1>
            <p className="page-sub" style={{ marginBottom: 0 }}>
              {cache?.syncedAt
                ? `Whoop synced ${new Date(cache.syncedAt).toLocaleString()}`
                : 'Your Whoop recovery, strain, sleep & workouts'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => (connected ? void sync() : connect())}
          >
            {busy ? 'Syncing…' : connected ? 'Sync' : 'Connect'}
          </button>
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{error}</p>}

        {!connected && !cache && (
          <div className="whoop-empty">
            <p>Connect your Whoop to fill this dashboard with live recovery, strain, sleep stages, and workouts.</p>
            <button type="button" className="btn btn-primary btn-block" onClick={connect}>
              Connect Whoop
            </button>
            <Link to="/profile" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>
              Open Settings
            </Link>
          </div>
        )}

        {(connected || cache) && (
          <>
            <div className="whoop-rings">
              <ScoreRing
                value={latestRecovery?.score?.recovery_score ?? null}
                label="Recovery"
                color={zoneColor}
                sub={zone === 'none' ? '—' : zone.toUpperCase()}
              />
              <ScoreRing
                value={latestCycle?.score?.strain ?? null}
                max={21}
                label="Strain"
                color="var(--accent)"
                sub={latestCycle?.score?.average_heart_rate ? `${latestCycle.score.average_heart_rate} avg HR` : '0–21'}
              />
              <ScoreRing
                value={latestSleep?.score?.sleep_performance_percentage ?? null}
                label="Sleep"
                color="#7dd3fc"
                sub={latestSleep ? `${sleepHoursFromWhoop(latestSleep)}h` : '—'}
              />
            </div>
          </>
        )}
      </div>

      {cache && (
        <>
          <div className="whoop-metrics">
            <div className="whoop-metric">
              <div className="label">HRV</div>
              <div className="num num-md">
                {latestRecovery?.score?.hrv_rmssd_milli != null
                  ? Math.round(latestRecovery.score.hrv_rmssd_milli)
                  : '—'}
                <span className="unit">ms</span>
              </div>
            </div>
            <div className="whoop-metric">
              <div className="label">Resting HR</div>
              <div className="num num-md">
                {latestRecovery?.score?.resting_heart_rate ?? '—'}
                <span className="unit">bpm</span>
              </div>
            </div>
            <div className="whoop-metric">
              <div className="label">SpO₂</div>
              <div className="num num-md">
                {latestRecovery?.score?.spo2_percentage != null
                  ? Math.round(latestRecovery.score.spo2_percentage)
                  : '—'}
                <span className="unit">%</span>
              </div>
            </div>
            <div className="whoop-metric">
              <div className="label">Skin temp</div>
              <div className="num num-md">
                {latestRecovery?.score?.skin_temp_celsius != null
                  ? latestRecovery.score.skin_temp_celsius.toFixed(1)
                  : '—'}
                <span className="unit">°C</span>
              </div>
            </div>
          </div>

          <div className="card whoop-card">
            <div className="card-title">Sleep night</div>
            {latestSleep ? (
              <>
                <div className="whoop-sleep-head">
                  <div>
                    <div className="num num-lg">{sleepHoursFromWhoop(latestSleep)}h</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      Asleep · {latestSleep.end.slice(0, 10)}
                    </div>
                  </div>
                  <div className="whoop-sleep-scores">
                    <div>
                      <span className="label">Performance</span>
                      <div className="num num-sm">
                        {latestSleep.score?.sleep_performance_percentage ?? '—'}%
                      </div>
                    </div>
                    <div>
                      <span className="label">Efficiency</span>
                      <div className="num num-sm">
                        {latestSleep.score?.sleep_efficiency_percentage != null
                          ? Math.round(latestSleep.score.sleep_efficiency_percentage)
                          : '—'}
                        %
                      </div>
                    </div>
                    <div>
                      <span className="label">Consistency</span>
                      <div className="num num-sm">
                        {latestSleep.score?.sleep_consistency_percentage ?? '—'}%
                      </div>
                    </div>
                  </div>
                </div>
                <StageBar label="Deep" hours={deepH} total={asleepTotal || 1} color="#6366f1" />
                <StageBar label="REM" hours={remH} total={asleepTotal || 1} color="#22d3ee" />
                <StageBar label="Light" hours={lightH} total={asleepTotal || 1} color="#94a3b8" />
                <StageBar label="Awake" hours={awakeH} total={asleepTotal + awakeH || 1} color="#f97316" />
                <div className="whoop-sleep-foot">
                  <span>
                    In bed {formatDurationMs(stages?.total_in_bed_time_milli)}
                  </span>
                  <span>Cycles {stages?.sleep_cycle_count ?? '—'}</span>
                  <span>Disturbances {stages?.disturbance_count ?? '—'}</span>
                  <span>
                    Resp{' '}
                    {latestSleep.score?.respiratory_rate != null
                      ? `${latestSleep.score.respiratory_rate.toFixed(1)}/min`
                      : '—'}
                  </span>
                </div>
                {latestSleep.score?.sleep_needed && (
                  <div className="whoop-need">
                    <div className="whoop-need-title">Sleep need</div>
                    <div className="whoop-metrics" style={{ marginBottom: 0 }}>
                      <div className="whoop-metric">
                        <div className="label">Baseline</div>
                        <div className="num num-sm">
                          {formatDurationMs(latestSleep.score.sleep_needed.baseline_milli)}
                        </div>
                      </div>
                      <div className="whoop-metric">
                        <div className="label">Debt</div>
                        <div className="num num-sm">
                          {formatDurationMs(latestSleep.score.sleep_needed.need_from_sleep_debt_milli)}
                        </div>
                      </div>
                      <div className="whoop-metric">
                        <div className="label">Strain</div>
                        <div className="num num-sm">
                          {formatDurationMs(
                            latestSleep.score.sleep_needed.need_from_recent_strain_milli,
                          )}
                        </div>
                      </div>
                      <div className="whoop-metric">
                        <div className="label">Nap credit</div>
                        <div className="num num-sm">
                          {formatDurationMs(latestSleep.score.sleep_needed.need_from_recent_nap_milli)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="empty">No sleep scored yet — sync after waking.</div>
            )}
          </div>

          {latestRecovery?.score?.user_calibrating && (
            <div className="whoop-banner">Whoop is still calibrating recovery for this account.</div>
          )}

          <div className="card whoop-card">
            <div className="card-title">14-day pulse</div>
            {trend.length > 1 ? (
              <div className="chart-wrap" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3DD68C" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#3DD68C" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="strainGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D7FF00" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#D7FF00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" stroke="#5c5c68" fontSize={11} />
                    <YAxis yAxisId="l" stroke="#5c5c68" fontSize={11} domain={[0, 100]} width={28} />
                    <YAxis yAxisId="r" orientation="right" stroke="#5c5c68" fontSize={11} domain={[0, 21]} width={28} />
                    <Tooltip
                      contentStyle={{
                        background: '#16161A',
                        border: '1px solid #26262e',
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      yAxisId="l"
                      type="monotone"
                      dataKey="recovery"
                      name="Recovery"
                      stroke="#3DD68C"
                      fill="url(#recGrad)"
                      strokeWidth={2}
                    />
                    <Area
                      yAxisId="r"
                      type="monotone"
                      dataKey="strain"
                      name="Strain"
                      stroke="#D7FF00"
                      fill="url(#strainGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty">Sync a few days to see trends.</div>
            )}
          </div>

          <div className="card whoop-card">
            <div className="card-title">Sleep performance</div>
            {trend.some((t) => t.sleep != null) ? (
              <div className="chart-wrap" style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend}>
                    <XAxis dataKey="date" stroke="#5c5c68" fontSize={11} />
                    <YAxis stroke="#5c5c68" fontSize={11} domain={[0, 100]} width={28} />
                    <Tooltip
                      contentStyle={{
                        background: '#16161A',
                        border: '1px solid #26262e',
                        borderRadius: 10,
                      }}
                    />
                    <Bar dataKey="sleep" name="Sleep %" fill="#7dd3fc" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty">No sleep performance history yet.</div>
            )}
          </div>

          <div className="section-label">Workouts</div>
          {cache.workouts.length === 0 ? (
            <div className="card empty">No Whoop workouts in the last 30 days.</div>
          ) : (
            cache.workouts.slice(0, 12).map((w) => {
              const mins = Math.max(
                1,
                Math.round((Date.parse(w.end) - Date.parse(w.start)) / 60000),
              )
              const kcal = kjToKcal(w.score?.kilojoule)
              return (
                <div key={w.id} className="whoop-workout">
                  <div>
                    <div className="whoop-workout-title">{formatSport(w.sport_name)}</div>
                    <div className="whoop-workout-meta">
                      {w.start.slice(0, 10)} · {mins} min
                      {w.score?.distance_meter
                        ? ` · ${(w.score.distance_meter / 1000).toFixed(2)} km`
                        : ''}
                    </div>
                  </div>
                  <div className="whoop-workout-stats">
                    <div>
                      <span className="label">Strain</span>
                      <div className="num num-sm">
                        {w.score?.strain != null ? w.score.strain.toFixed(1) : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="label">Avg HR</span>
                      <div className="num num-sm">{w.score?.average_heart_rate ?? '—'}</div>
                    </div>
                    <div>
                      <span className="label">Max HR</span>
                      <div className="num num-sm">{w.score?.max_heart_rate ?? '—'}</div>
                    </div>
                    <div>
                      <span className="label">kcal</span>
                      <div className="num num-sm">{kcal ?? '—'}</div>
                    </div>
                  </div>
                  {(w.score?.altitude_gain_meter != null || w.score?.percent_recorded != null) && (
                    <div className="whoop-workout-extra">
                      {w.score.altitude_gain_meter != null && (
                        <span>↑ {Math.round(w.score.altitude_gain_meter)} m elev</span>
                      )}
                      {w.score.percent_recorded != null && (
                        <span>{Math.round(w.score.percent_recorded)}% recorded</span>
                      )}
                      {w.score.kilojoule != null && (
                        <span>{Math.round(w.score.kilojoule)} kJ</span>
                      )}
                    </div>
                  )}
                  {w.score?.zone_durations && (
                    <>
                      <div className="whoop-zones">
                        {[
                          w.score.zone_durations.zone_one_milli,
                          w.score.zone_durations.zone_two_milli,
                          w.score.zone_durations.zone_three_milli,
                          w.score.zone_durations.zone_four_milli,
                          w.score.zone_durations.zone_five_milli,
                        ].map((ms, i) => {
                          const total =
                            (w.score?.zone_durations?.zone_one_milli ?? 0) +
                            (w.score?.zone_durations?.zone_two_milli ?? 0) +
                            (w.score?.zone_durations?.zone_three_milli ?? 0) +
                            (w.score?.zone_durations?.zone_four_milli ?? 0) +
                            (w.score?.zone_durations?.zone_five_milli ?? 0)
                          const pct = total > 0 ? ((ms ?? 0) / total) * 100 : 0
                          const colors = ['#22d3ee', '#3dd68c', '#d7ff00', '#f5a524', '#f04438']
                          return (
                            <div
                              key={i}
                              className="whoop-zone"
                              style={{ width: `${pct}%`, background: colors[i] }}
                              title={`Z${i + 1}: ${formatDurationMs(ms)}`}
                            />
                          )
                        })}
                      </div>
                      <div className="whoop-zone-legend">
                        {['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map((z, i) => (
                          <span key={z}>
                            {z}{' '}
                            {formatDurationMs(
                              [
                                w.score?.zone_durations?.zone_one_milli,
                                w.score?.zone_durations?.zone_two_milli,
                                w.score?.zone_durations?.zone_three_milli,
                                w.score?.zone_durations?.zone_four_milli,
                                w.score?.zone_durations?.zone_five_milli,
                              ][i],
                            )}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })
          )}

          <div className="card whoop-card">
            <div className="card-title">Sleep history</div>
            {cache.sleeps.filter((s) => !s.nap).length === 0 ? (
              <div className="empty">No overnight sleeps synced yet.</div>
            ) : (
              cache.sleeps
                .filter((s) => !s.nap)
                .slice(0, 10)
                .map((s) => {
                  const rec = cache.recoveries.find((r) => r.sleep_id === s.id)
                  return (
                    <div key={s.id} className="whoop-cycle-row">
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.end.slice(0, 10)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {sleepHoursFromWhoop(s)}h · Perf{' '}
                          {s.score?.sleep_performance_percentage ?? '—'}% · Eff{' '}
                          {s.score?.sleep_efficiency_percentage != null
                            ? Math.round(s.score.sleep_efficiency_percentage)
                            : '—'}
                          %
                        </div>
                      </div>
                      <div className="whoop-cycle-nums">
                        <span style={{ color: '#7dd3fc' }}>
                          {s.score?.sleep_consistency_percentage ?? '—'}
                        </span>
                        <span
                          style={{
                            color:
                              recoveryZone(rec?.score?.recovery_score) === 'green'
                                ? 'var(--green)'
                                : recoveryZone(rec?.score?.recovery_score) === 'yellow'
                                  ? 'var(--amber)'
                                  : rec?.score?.recovery_score != null
                                    ? 'var(--red)'
                                    : 'var(--text-dim)',
                          }}
                        >
                          R {rec?.score?.recovery_score ?? '—'}
                        </span>
                      </div>
                    </div>
                  )
                })
            )}
          </div>

          {cache.sleeps.some((s) => s.nap) && (
            <div className="card whoop-card">
              <div className="card-title">Naps</div>
              {cache.sleeps
                .filter((s) => s.nap)
                .slice(0, 8)
                .map((s) => (
                  <div key={s.id} className="whoop-cycle-row">
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.start.slice(0, 10)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(s.start).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        –{' '}
                        {new Date(s.end).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="whoop-cycle-nums">
                      <span style={{ color: '#94a3b8' }}>{sleepHoursFromWhoop(s)}h</span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <div className="card whoop-card">
            <div className="card-title">Body</div>
            <div className="whoop-metrics" style={{ marginBottom: 0 }}>
              <div className="whoop-metric">
                <div className="label">Weight</div>
                <div className="num num-md">
                  {cache.body?.weight_kilogram != null
                    ? cache.body.weight_kilogram.toFixed(1)
                    : '—'}
                  <span className="unit">kg</span>
                </div>
              </div>
              <div className="whoop-metric">
                <div className="label">Height</div>
                <div className="num num-md">
                  {cache.body?.height_meter != null
                    ? (cache.body.height_meter * 100).toFixed(0)
                    : '—'}
                  <span className="unit">cm</span>
                </div>
              </div>
              <div className="whoop-metric">
                <div className="label">Max HR</div>
                <div className="num num-md">
                  {cache.body?.max_heart_rate ?? '—'}
                  <span className="unit">bpm</span>
                </div>
              </div>
              <div className="whoop-metric">
                <div className="label">Day kJ</div>
                <div className="num num-md">
                  {latestCycle?.score?.kilojoule != null
                    ? Math.round(latestCycle.score.kilojoule)
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="card whoop-card">
            <div className="card-title">Recent cycles</div>
            {cache.cycles.slice(0, 10).map((c) => {
              const rec = cache.recoveries.find((r) => r.cycle_id === c.id)
              return (
                <div key={c.id} className="whoop-cycle-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.start.slice(0, 10)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Avg HR {c.score?.average_heart_rate ?? '—'} · Max{' '}
                      {c.score?.max_heart_rate ?? '—'}
                      {c.score?.kilojoule != null
                        ? ` · ${Math.round(c.score.kilojoule)} kJ`
                        : ''}
                      {rec?.score?.hrv_rmssd_milli != null
                        ? ` · HRV ${Math.round(rec.score.hrv_rmssd_milli)}`
                        : ''}
                    </div>
                  </div>
                  <div className="whoop-cycle-nums">
                    <span style={{ color: 'var(--accent)' }}>
                      S {c.score?.strain != null ? c.score.strain.toFixed(1) : '—'}
                    </span>
                    <span
                      style={{
                        color:
                          recoveryZone(rec?.score?.recovery_score) === 'green'
                            ? 'var(--green)'
                            : recoveryZone(rec?.score?.recovery_score) === 'yellow'
                              ? 'var(--amber)'
                              : rec?.score?.recovery_score != null
                                ? 'var(--red)'
                                : 'var(--text-dim)',
                      }}
                    >
                      R {rec?.score?.recovery_score ?? '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {cache.profile && (
            <div className="card whoop-card">
              <div className="card-title">Profile</div>
              <div className="whoop-profile">
                <div>
                  <div className="label">Name</div>
                  <div style={{ fontWeight: 600 }}>{name || '—'}</div>
                </div>
                <div>
                  <div className="label">Email</div>
                  <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>
                    {cache.profile.email ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="label">User ID</div>
                  <div className="num num-sm">{cache.profile.user_id}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
