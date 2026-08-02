import { useNavigate } from 'react-router-dom'
import type { CoachIntensity, CoachMove } from '../lib/coach'
import { useStore } from '../store/StoreContext'

const INTENSITY_COLOR: Record<CoachIntensity, string> = {
  rest: 'var(--text-muted)',
  easy: '#7dd3fc',
  moderate: 'var(--amber)',
  hard: 'var(--accent)',
  race: 'var(--green)',
}

const INTENSITY_LABEL: Record<CoachIntensity, string> = {
  rest: 'Rest',
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
  race: 'Race',
}

export function NextMoveCard({
  move,
  compact = false,
}: {
  move: CoachMove
  compact?: boolean
}) {
  const navigate = useNavigate()
  const { dispatch } = useStore()
  const color = INTENSITY_COLOR[move.intensity]

  const go = () => {
    if (move.cta.workoutType === 'strength' || move.cta.workoutType === 'walk') {
      dispatch({
        type: 'START_WORKOUT',
        workoutType: move.cta.workoutType === 'walk' ? 'walk' : 'strength',
      })
    }
    navigate(move.cta.to)
  }

  return (
    <div className={`next-move ${compact ? 'next-move-compact' : ''}`}>
      <div className="next-move-top">
        <div>
          <div className="next-move-kicker">{move.title}</div>
          <h2 className="next-move-headline">{move.headline}</h2>
        </div>
        <div className="next-move-intensity" style={{ color, borderColor: color }}>
          {INTENSITY_LABEL[move.intensity]}
        </div>
      </div>

      <div className="next-move-badges">
        {move.badges.map((b) => (
          <span key={b} className="next-move-badge">
            {b}
          </span>
        ))}
        {move.adjusted && <span className="next-move-badge next-move-badge-adj">Plan adjusted</span>}
      </div>

      <p className="next-move-action">{move.action}</p>

      {!compact && (
        <div className="next-move-plan">
          <span className="label">Today’s call</span>
          <div className="next-move-plan-focus">{move.planFocus}</div>
        </div>
      )}

      {!compact && move.rationale.length > 0 && (
        <ul className="next-move-why">
          {move.rationale.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {!compact && (
        <div className="next-move-metrics">
          <div>
            <div className="label">Recovery</div>
            <div className="num num-sm">{move.metrics.recovery ?? '—'}%</div>
          </div>
          <div>
            <div className="label">Strain</div>
            <div className="num num-sm">
              {move.metrics.strain != null ? move.metrics.strain.toFixed(1) : '—'}
            </div>
          </div>
          <div>
            <div className="label">Sleep</div>
            <div className="num num-sm">
              {move.metrics.sleepHours != null ? `${move.metrics.sleepHours}h` : '—'}
            </div>
          </div>
          <div>
            <div className="label">Race</div>
            <div className="num num-sm">{Math.max(0, move.metrics.daysToRace)}d</div>
          </div>
        </div>
      )}

      <button type="button" className="btn btn-primary btn-block" onClick={go}>
        {move.cta.label}
      </button>
    </div>
  )
}
