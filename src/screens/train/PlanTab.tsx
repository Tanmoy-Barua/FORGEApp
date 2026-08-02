import { useState } from 'react'
import { useStore } from '../../store/StoreContext'
import { formatMinutes, weekdayOf } from '../../utils/dates'

export function PlanTab() {
  const { state } = useStore()
  const today = weekdayOf()
  const [open, setOpen] = useState<string | null>(today)

  return (
    <div>
      <p className="page-sub" style={{ marginTop: 0 }}>
        Your weekly template. Tap a day to see blocks.
      </p>
      {state.plan.map((day) => {
        const isOpen = open === day.weekday
        const isToday = day.weekday === today
        return (
          <div key={day.weekday} className={`plan-day ${isToday ? 'today' : ''}`}>
            <button
              type="button"
              className="plan-day-head"
              onClick={() => setOpen(isOpen ? null : day.weekday)}
            >
              <span className="day">{day.weekday}</span>
              <span className="focus">
                {day.focus}
                {isToday ? ' · today' : ''}
              </span>
              <span className="mins">
                {day.targetMinutes ? formatMinutes(day.targetMinutes) : 'Rest'}
              </span>
            </button>
            {isOpen ? (
              <div className="plan-blocks">
                {day.blocks.map((block) => (
                  <div key={block.name} className="plan-block">
                    <h4>{block.name}</h4>
                    <ul>
                      {block.exercises.map((ex) => (
                        <li key={ex}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
