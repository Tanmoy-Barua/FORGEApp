import { Link } from 'react-router-dom'
import type { DailyTargets } from '../lib/coach'

const INTENSITY_LABEL = {
  rest: 'Rest',
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
  race: 'Race',
} as const

export function DailyTargetsCard({ targets }: { targets: DailyTargets }) {
  const { sleep, workout, fuel } = targets

  return (
    <div className="daily-targets">
      <div className="daily-targets-head">
        <div>
          <div className="daily-targets-kicker">Tomorrow’s targets</div>
          <h2 className="daily-targets-title">
            {targets.forWeekday} · sleep · train · eat
          </h2>
        </div>
        <div className="daily-targets-date">{targets.forDate.slice(5)}</div>
      </div>

      <div className="daily-targets-grid">
        <div className="daily-target sleep">
          <div className="daily-target-label">Sleep tonight</div>
          <div className="num daily-target-num">
            {sleep.hours}
            <span className="unit">h</span>
          </div>
          <div className="daily-target-sub">{sleep.bedtimeHint}</div>
          {sleep.breakdown && (
            <div className="daily-target-breakdown">
              Base {sleep.breakdown.baseline}h · Debt {sleep.breakdown.debt}h · Strain{' '}
              {sleep.breakdown.strain}h
              {sleep.breakdown.nap !== 0 ? ` · Nap ${sleep.breakdown.nap}h` : ''}
            </div>
          )}
          <p className="daily-target-detail">{sleep.detail}</p>
          <span className="daily-target-tag">
            {sleep.source === 'whoop' ? 'Whoop need' : 'Estimated'}
          </span>
        </div>

        <div className="daily-target workout">
          <div className="daily-target-label">Workout tomorrow</div>
          <div className="num daily-target-num">
            {workout.minutes}
            <span className="unit">min</span>
          </div>
          <div className="daily-target-sub">
            Strain aim {workout.strainTarget} · {INTENSITY_LABEL[workout.intensity]}
          </div>
          <div className="daily-target-focus">{workout.focus}</div>
          <p className="daily-target-detail">{workout.detail}</p>
          {workout.adjusted && <span className="daily-target-tag adj">Adjusted from plan</span>}
          <Link to="/train" className="btn btn-soft btn-sm" style={{ marginTop: 10 }}>
            Open Train
          </Link>
        </div>

        <div className="daily-target fuel">
          <div className="daily-target-label">Eat tomorrow</div>
          <div className="num daily-target-num">
            {fuel.calories}
            <span className="unit">kcal</span>
          </div>
          <div className="daily-target-macros">
            <div>
              <span className="label">Protein</span>
              <div className="num num-sm">{fuel.proteinG}g</div>
            </div>
            <div>
              <span className="label">Carbs</span>
              <div className="num num-sm">{fuel.carbsG}g</div>
            </div>
            <div>
              <span className="label">Fat</span>
              <div className="num num-sm">{fuel.fatG}g</div>
            </div>
            <div>
              <span className="label">Water</span>
              <div className="num num-sm">{(fuel.waterMl / 1000).toFixed(1)}L</div>
            </div>
          </div>
          <p className="daily-target-detail">{fuel.detail}</p>
          {fuel.adjusted && <span className="daily-target-tag adj">Tuned to Whoop + session</span>}
          <Link to="/fuel" className="btn btn-soft btn-sm" style={{ marginTop: 10 }}>
            Open Fuel
          </Link>
        </div>
      </div>

      {targets.notes.length > 0 && (
        <ul className="daily-targets-notes">
          {targets.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
