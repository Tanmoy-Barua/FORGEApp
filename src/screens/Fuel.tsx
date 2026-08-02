import { useMemo, useState } from 'react'
import { Ring } from '../components/ui/Ring'
import { Sheet } from '../components/ui/Sheet'
import { useStore } from '../store/StoreContext'
import { foodEntryMacros, macrosForDay, todayPlan, waterForDay } from '../utils/calculations'
import { todayKey } from '../utils/dates'
import type { MealSlot } from '../types'

const MEAL_SLOTS: { key: MealSlot; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'preworkout', label: 'Pre-workout' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
]

export function Fuel() {
  const store = useStore()
  const date = todayKey()
  const macros = macrosForDay(store.state, date)
  const water = waterForDay(store.state, date)
  const waterPct = Math.min(water / store.state.profile.waterTargetMl, 1)
  const [pickerSlot, setPickerSlot] = useState<MealSlot | null>(null)
  const [showAvoided, setShowAvoided] = useState(false)

  const plan = todayPlan(store.state)
  const showPreworkoutNudge = !!plan.targetMinutes && plan.targetMinutes >= 45

  const entriesBySlot = useMemo(() => {
    const map: Record<MealSlot, typeof store.state.foodEntries> = {
      breakfast: [],
      lunch: [],
      preworkout: [],
      dinner: [],
      snack: [],
    }
    for (const e of store.state.foodEntries.filter((f) => f.date === date)) {
      map[e.mealSlot].push(e)
    }
    return map
  }, [store.state.foodEntries, date])

  const library = store.state.foodLibrary.filter((f) =>
    showAvoided ? true : !f.tags.includes('avoid'),
  )

  return (
    <div className="page">
      <h1 className="page-title">Fuel</h1>
      <p className="page-sub">Food, water, macros — fast between deliveries</p>

      <div className="card">
        <div className="rings-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <Ring
            value={macros.protein}
            max={store.state.profile.proteinTarget}
            label="Protein"
            display={`${Math.round(macros.protein)}`}
          />
          <Ring
            value={macros.carbs}
            max={store.state.profile.carbsTarget}
            label="Carbs"
            display={`${Math.round(macros.carbs)}`}
          />
          <Ring
            value={macros.fat}
            max={store.state.profile.fatTarget}
            label="Fat"
            display={`${Math.round(macros.fat)}`}
          />
          <Ring
            value={macros.calories}
            max={store.state.profile.calorieTarget}
            label="Kcal"
            display={`${Math.round(macros.calories)}`}
          />
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div className="card-title">Water</div>
        <div className="water-glass">
          <div className="water-fill" style={{ height: `${waterPct * 100}%` }} />
        </div>
        <div className="num num-lg">
          {(water / 1000).toFixed(2)}
          <span className="unit">/ {(store.state.profile.waterTargetMl / 1000).toFixed(1)} L</span>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: 14 }}
          onClick={() => store.addWater(250)}
        >
          + 250 mL
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={() => store.addWater(500)}>
            + 500 mL
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => store.addWater(1000)}>
            + 1 L
          </button>
        </div>
      </div>

      {showPreworkoutNudge && (
        <div className="card" style={{ borderColor: 'rgba(215,255,0,0.25)' }}>
          <div className="card-title">Pre-workout</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
            Session today (~{plan.targetMinutes} min). Banana + whey 60–90 min before.
          </p>
          <button
            type="button"
            className="btn btn-soft btn-block"
            onClick={() => store.addMealTemplate('tpl-preworkout', 'preworkout')}
          >
            Log banana + whey
          </button>
        </div>
      )}

      <div className="section-label">Meal templates</div>
      {store.state.mealTemplates.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          className="library-item"
          onClick={() => store.addMealTemplate(tpl.id, 'lunch')}
        >
          <span style={{ fontWeight: 600 }}>{tpl.name}</span>
          <span className="tag">Add</span>
        </button>
      ))}

      <div className="section-label">Today&apos;s log</div>
      {MEAL_SLOTS.map((slot) => (
        <div key={slot.key} className="card meal-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{slot.label}</h3>
            <button
              type="button"
              className="btn btn-sm btn-soft"
              onClick={() => setPickerSlot(slot.key)}
            >
              + Add
            </button>
          </div>
          {entriesBySlot[slot.key].length === 0 ? (
            <div className="empty" style={{ padding: 12 }}>
              Nothing logged
            </div>
          ) : (
            entriesBySlot[slot.key].map((entry) => {
              const food = store.state.foodLibrary.find((f) => f.id === entry.foodItemId)
              const m = foodEntryMacros(store.state, entry)
              return (
                <div key={entry.id} className="food-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {food?.name ?? 'Food'} × {entry.servings}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {Math.round(m.protein)}g P · {Math.round(m.calories)} kcal
                      {food?.tags.includes('lactose') ? (
                        <span className="tag lactose" style={{ marginLeft: 6 }}>
                          Lactose
                        </span>
                      ) : null}
                      {food?.tags.includes('lactose-free') ? (
                        <span className="tag" style={{ marginLeft: 6 }}>
                          LF swap
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => store.removeFood(entry.id)}
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              )
            })
          )}
        </div>
      ))}

      <Sheet
        open={!!pickerSlot}
        onClose={() => setPickerSlot(null)}
        title={`Add to ${pickerSlot ?? ''}`}
        subtitle="Your personal food library"
      >
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          style={{ marginBottom: 12 }}
          onClick={() => setShowAvoided((v) => !v)}
        >
          {showAvoided ? 'Hide avoided foods' : 'Show avoided foods'}
        </button>
        {library.map((food) => (
          <button
            key={food.id}
            type="button"
            className="library-item"
            onClick={() => {
              if (pickerSlot) store.addFood(pickerSlot, food.id, 1)
              setPickerSlot(null)
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{food.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {food.servingLabel} · {food.protein}g P · {food.calories} kcal
              </div>
              <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {food.tags.includes('lactose') && <span className="tag lactose">Lactose</span>}
                {food.tags.includes('lactose-free') && <span className="tag">Lactose-free</span>}
                {food.tags.includes('avoid') && <span className="tag avoid">Avoid</span>}
              </div>
            </div>
            <span className="num num-sm" style={{ color: 'var(--accent)' }}>
              +
            </span>
          </button>
        ))}
      </Sheet>
    </div>
  )
}
