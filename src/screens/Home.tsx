import { Link, useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Ring } from '../components/ui/Ring'
import { useStore } from '../store/StoreContext'
import {
  computeStreak,
  consistencyHeatmap,
  habitStatus,
  latestWeight,
  macrosForDay,
  movingAverage,
  sleepForDay,
  stepsForDay,
  todayPlan,
  waterForDay,
  weekSessionStats,
  weightTrend,
  workoutDoneToday,
} from '../utils/calculations'
import { daysUntil, formatMinutes, raceProgress, todayKey } from '../utils/dates'
import type { HabitKey } from '../types'

const HABITS: { key: HabitKey; label: string }[] = [
  { key: 'workout', label: 'Workout' },
  { key: 'protein', label: 'Protein' },
  { key: 'hydration', label: 'Hydration' },
  { key: 'steps', label: 'Steps' },
  { key: 'sleep', label: 'Sleep' },
]

export function Home() {
  const { state, toggleHabit, dispatch } = useStore()
  const navigate = useNavigate()
  const date = todayKey()
  const plan = todayPlan(state)
  const days = daysUntil(state.profile.raceDate)
  const progress = raceProgress(state.profile.programStart, state.profile.raceDate)
  const macros = macrosForDay(state, date)
  const water = waterForDay(state, date)
  const steps = stepsForDay(state, date)
  const trained = workoutDoneToday(state, date)
  const weight = latestWeight(state.weightEntries)
  const trend = weightTrend(state.weightEntries)
  const streak = computeStreak(state)
  const week = weekSessionStats(state)
  const sleep = sleepForDay(state, date)
  const recovery = [...(state.recoveryEntries ?? [])]
    .filter((r) => r.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const heat = consistencyHeatmap(state, 84)
  const weightChart = movingAverage(state.weightEntries).slice(-30)

  const trendArrow = trend === 'down' ? '↓' : trend === 'up' ? '↑' : '→'
  const trendClass = `trend-${trend}`
  const recoveryColor =
    !recovery ? 'var(--text-muted)' : recovery.score >= 67 ? 'var(--green)' : recovery.score >= 34 ? 'var(--amber)' : 'var(--red)'

  return (
    <div className="page">
      <div className="race-banner">
        <div className="race-label">{state.profile.raceName}</div>
        <div className="race-days">
          {Math.max(0, days)}
          <small>days</small>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Today</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <div className="num num-md" style={{ marginBottom: 4 }}>
              {plan.weekday}
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{plan.focus}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {plan.targetMinutes
                ? `Target ${formatMinutes(plan.targetMinutes)}`
                : 'Rest day — optional 30-min walk'}
            </div>
          </div>
          {trained ? (
            <span className="tag" style={{ background: 'rgba(61,214,140,0.15)', color: 'var(--green)' }}>
              Done
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: 16 }}
          onClick={() => {
            if (plan.weekday === 'Sat') {
              navigate('/train?tab=hyrox')
            } else if (plan.focus.toLowerCase().includes('run') || !plan.targetMinutes) {
              navigate('/train?tab=log')
            } else {
              dispatch({ type: 'START_WORKOUT', workoutType: 'strength' })
              navigate('/train?tab=log')
            }
          }}
        >
          {trained ? 'Log another' : plan.targetMinutes ? 'Start session' : 'Log walk'}
        </button>
      </div>

      <div className="card">
        <div className="card-title">Daily rings</div>
        <div className="rings-row">
          <Ring
            value={macros.protein}
            max={state.profile.proteinTarget}
            label="Protein"
            display={`${Math.round(macros.protein)}`}
          />
          <Ring
            value={water}
            max={state.profile.waterTargetMl}
            label="Water"
            display={`${(water / 1000).toFixed(1)}`}
          />
          <Ring
            value={steps}
            max={state.profile.stepsTarget}
            label="Steps"
            display={steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : `${steps}`}
          />
          <Ring
            value={trained ? 1 : 0}
            max={1}
            label="Train"
            display={trained ? '✓' : '—'}
            color="var(--accent)"
          />
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>
              Streak
            </div>
            <div className="num num-lg">
              {streak}
              <span className="unit">days</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="card-title" style={{ marginBottom: 4 }}>
              This week
            </div>
            <div className="num num-lg">
              {week.done}
              <span className="unit">/ {week.planned}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-row" style={{ marginBottom: 12 }}>
        <div className="stat-chip">
          <div className="label">Weight</div>
          <div className={`num num-sm ${trendClass}`}>
            {weight ? weight.kg.toFixed(1) : '—'} {trendArrow}
          </div>
        </div>
        <Link to="/whoop" className="stat-chip" style={{ display: 'block' }}>
          <div className="label">Recovery</div>
          <div className="num num-sm" style={{ color: recoveryColor }}>
            {recovery ? `${Math.round(recovery.score)}%` : '—'}
          </div>
        </Link>
        <div className="stat-chip">
          <div className="label">Sleep</div>
          <div className="num num-sm">{sleep ? `${sleep.hours}h` : '—'}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Today&apos;s checklist</div>
        <div className="check-list">
          {HABITS.map((h) => {
            const done = habitStatus(state, h.key, date)
            return (
              <button
                key={h.key}
                type="button"
                className={`check-item ${done ? 'done' : ''}`}
                onClick={() => toggleHabit(h.key)}
              >
                <span className="check-box">{done ? '✓' : ''}</span>
                <span style={{ fontWeight: 600 }}>{h.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="section-label">Progress</div>

      <div className="card">
        <div className="card-title">Weight trend</div>
        {weightChart.length > 1 ? (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightChart}>
                <defs>
                  <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
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
                    fontSize: 12,
                  }}
                  labelFormatter={(l) => String(l)}
                  formatter={(v) => [`${v} kg`, '7-day avg']}
                />
                <Area
                  type="monotone"
                  dataKey="avg"
                  stroke="#D7FF00"
                  fill="url(#wGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty">Log weight to see your trend.</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          <span>Start {state.profile.startWeight} kg</span>
          <span>Target {state.profile.targetWeight} kg</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Consistency</div>
        <div className="heatmap" aria-label="Training consistency heatmap">
          {heat.map((d) => (
            <div key={d.date} className={`heat-cell l${d.level}`} title={d.date} />
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)' }}>
          Last 12 weeks · darker = trained + fueled
        </div>
      </div>

      <Link to="/profile" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>
        Plan settings & export
      </Link>
    </div>
  )
}
