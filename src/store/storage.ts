import type { AppState } from '../types'
import { DEFAULT_FOOD_LIBRARY, DEFAULT_MEAL_TEMPLATES } from '../data/foods'
import { DEFAULT_WEEKLY_PLAN } from '../data/plan'

const STORAGE_KEY = 'forge_v1'

export function createInitialState(): AppState {
  return {
    profile: {
      name: 'Athlete',
      startWeight: 108,
      targetWeight: 92,
      raceName: 'HYROX Anaheim',
      raceDate: '2026-12-06',
      programStart: '2026-08-01',
      proteinTarget: 200,
      carbsTarget: 220,
      fatTarget: 65,
      calorieTarget: 2300,
      waterTargetMl: 3500,
      stepsTarget: 9000,
      sleepTargetHours: 8,
    },
    plan: DEFAULT_WEEKLY_PLAN,
    workouts: [],
    runs: [],
    hyroxLogs: [],
    simulations: [],
    foodLibrary: DEFAULT_FOOD_LIBRARY,
    foodEntries: [],
    mealTemplates: DEFAULT_MEAL_TEMPLATES,
    waterEntries: [],
    weightEntries: [
      { id: 'w_start', date: '2026-08-01', kg: 108 },
    ],
    measurements: [],
    bodyComp: [],
    sleepEntries: [],
    habitTicks: [],
    progressPhotos: [],
    stepsEntries: [],
    activeWorkoutId: null,
    activeSimId: null,
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    const base = createInitialState()
    return {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...parsed.profile },
      foodLibrary: parsed.foodLibrary?.length ? parsed.foodLibrary : base.foodLibrary,
      mealTemplates: parsed.mealTemplates?.length ? parsed.mealTemplates : base.mealTemplates,
      plan: parsed.plan?.length ? parsed.plan : base.plan,
    }
  } catch {
    return createInitialState()
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.error('Failed to persist FORGE state', err)
  }
}

export function exportStateJson(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function exportCsv(state: AppState): string {
  const lines: string[] = []
  lines.push('type,date,field,value')
  for (const w of state.weightEntries) {
    lines.push(`weight,${w.date},kg,${w.kg}`)
  }
  for (const s of state.sleepEntries) {
    lines.push(`sleep,${s.date},hours,${s.hours}`)
    lines.push(`sleep,${s.date},quality,${s.quality}`)
  }
  for (const r of state.runs) {
    lines.push(`run,${r.date},distanceKm,${r.distanceKm}`)
    lines.push(`run,${r.date},timeSeconds,${r.timeSeconds}`)
  }
  for (const wo of state.workouts) {
    lines.push(`workout,${wo.date},type,${wo.type}`)
    lines.push(`workout,${wo.date},duration,${wo.durationMinutes}`)
  }
  for (const e of state.foodEntries) {
    lines.push(`food,${e.date},${e.mealSlot},${e.foodItemId}x${e.servings}`)
  }
  for (const w of state.waterEntries) {
    lines.push(`water,${w.date},ml,${w.amountMl}`)
  }
  return lines.join('\n')
}
