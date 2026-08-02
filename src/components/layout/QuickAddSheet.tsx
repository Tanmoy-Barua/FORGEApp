import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../ui/Sheet'
import { useStore } from '../../store/StoreContext'
import type { MealSlot, SleepQuality } from '../../types'

interface QuickAddSheetProps {
  open: boolean
  onClose: () => void
}

type Mode =
  | 'menu'
  | 'weight'
  | 'water'
  | 'meal'
  | 'sleep'
  | 'steps'
  | 'workout'

export function QuickAddSheet({ open, onClose }: QuickAddSheetProps) {
  const store = useStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('menu')
  const [weight, setWeight] = useState('')
  const [steps, setSteps] = useState('')
  const [sleepHours, setSleepHours] = useState('8')
  const [sleepQuality, setSleepQuality] = useState<SleepQuality>('good')
  const [mealSlot, setMealSlot] = useState<MealSlot>('snack')

  const close = () => {
    setMode('menu')
    onClose()
  }

  const preferredFoods = store.state.foodLibrary.filter((f) => f.tags.includes('preferred'))

  return (
    <Sheet
      open={open}
      onClose={close}
      title={mode === 'menu' ? 'Quick log' : mode.charAt(0).toUpperCase() + mode.slice(1)}
      subtitle={mode === 'menu' ? 'One tap. Under 3 seconds.' : undefined}
    >
      {mode === 'menu' && (
        <div className="quick-grid">
          <button type="button" className="quick-tile" onClick={() => setMode('weight')}>
            <span className="qt-icon">KG</span>
            Weight
          </button>
          <button
            type="button"
            className="quick-tile"
            onClick={() => {
              store.addWater(250)
              close()
            }}
          >
            <span className="qt-icon">+250</span>
            Water
          </button>
          <button type="button" className="quick-tile" onClick={() => setMode('meal')}>
            <span className="qt-icon">EAT</span>
            Meal
          </button>
          <button
            type="button"
            className="quick-tile"
            onClick={() => {
              close()
              navigate('/train?tab=log')
              store.dispatch({ type: 'START_WORKOUT', workoutType: 'strength' })
            }}
          >
            <span className="qt-icon">SET</span>
            Workout
          </button>
          <button type="button" className="quick-tile" onClick={() => setMode('sleep')}>
            <span className="qt-icon">ZZZ</span>
            Sleep
          </button>
          <button type="button" className="quick-tile" onClick={() => setMode('steps')}>
            <span className="qt-icon">10K</span>
            Steps
          </button>
        </div>
      )}

      {mode === 'weight' && (
        <>
          <div className="field">
            <label>Weight (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="92.4"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!weight}
            onClick={() => {
              store.addWeight(parseFloat(weight))
              close()
            }}
          >
            Save weight
          </button>
          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setMode('menu')}>
            Back
          </button>
        </>
      )}

      {mode === 'steps' && (
        <>
          <div className="field">
            <label>Steps today</label>
            <input
              type="number"
              inputMode="numeric"
              autoFocus
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="8500"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!steps}
            onClick={() => {
              store.addSteps(parseInt(steps, 10))
              close()
            }}
          >
            Save steps
          </button>
          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setMode('menu')}>
            Back
          </button>
        </>
      )}

      {mode === 'sleep' && (
        <>
          <div className="field-row-2">
            <div className="field">
              <label>Hours</label>
              <input
                type="number"
                inputMode="decimal"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
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
            onClick={() => {
              store.addSleep(parseFloat(sleepHours), sleepQuality)
              close()
            }}
          >
            Save sleep
          </button>
          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setMode('menu')}>
            Back
          </button>
        </>
      )}

      {mode === 'meal' && (
        <>
          <div className="field">
            <label>Meal slot</label>
            <select value={mealSlot} onChange={(e) => setMealSlot(e.target.value as MealSlot)}>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="preworkout">Pre-workout</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>
          <div className="section-label">Templates</div>
          {store.state.mealTemplates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="library-item"
              onClick={() => {
                store.addMealTemplate(tpl.id, mealSlot)
                close()
              }}
            >
              <span>{tpl.name}</span>
              <span className="tag">1-tap</span>
            </button>
          ))}
          <div className="section-label">Foods</div>
          {preferredFoods.map((food) => (
            <button
              key={food.id}
              type="button"
              className="library-item"
              onClick={() => {
                store.addFood(mealSlot, food.id, 1)
                close()
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{food.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {food.protein}g P · {food.calories} kcal
                </div>
              </div>
              <span className="num num-sm" style={{ color: 'var(--accent)' }}>
                +
              </span>
            </button>
          ))}
          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setMode('menu')}>
            Back
          </button>
        </>
      )}
    </Sheet>
  )
}
