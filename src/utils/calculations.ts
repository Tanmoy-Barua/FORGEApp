import type {
  AppState,
  FoodEntry,
  HabitKey,
  HyroxStationLog,
  PlanDay,
  RunSession,
  WeightEntry,
  Workout,
} from '../types'
import { HYROX_BASELINE_SECONDS, HYROX_STATIONS } from '../data/hyrox'
import { todayKey, weekDates, weekdayOf } from './dates'

export function movingAverage(entries: WeightEntry[], window = 7): { date: string; avg: number }[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((entry, i) => {
    const slice = sorted.slice(Math.max(0, i - window + 1), i + 1)
    const avg = slice.reduce((s, e) => s + e.kg, 0) / slice.length
    return { date: entry.date, avg: Math.round(avg * 10) / 10 }
  })
}

export function latestWeight(entries: WeightEntry[]): WeightEntry | null {
  if (!entries.length) return null
  return [...entries].sort((a, b) => b.date.localeCompare(a.date))[0]
}

export function weightTrend(entries: WeightEntry[]): 'up' | 'down' | 'flat' {
  const avgs = movingAverage(entries)
  if (avgs.length < 2) return 'flat'
  const recent = avgs[avgs.length - 1].avg
  const prev = avgs[Math.max(0, avgs.length - 8)].avg
  const delta = recent - prev
  if (delta < -0.2) return 'down'
  if (delta > 0.2) return 'up'
  return 'flat'
}

export function macrosForDay(
  state: AppState,
  date = todayKey(),
): { protein: number; carbs: number; fat: number; calories: number } {
  const entries = state.foodEntries.filter((e) => e.date === date)
  return entries.reduce(
    (acc, entry) => {
      const food = state.foodLibrary.find((f) => f.id === entry.foodItemId)
      if (!food) return acc
      return {
        protein: acc.protein + food.protein * entry.servings,
        carbs: acc.carbs + food.carbs * entry.servings,
        fat: acc.fat + food.fat * entry.servings,
        calories: acc.calories + food.calories * entry.servings,
      }
    },
    { protein: 0, carbs: 0, fat: 0, calories: 0 },
  )
}

export function waterForDay(state: AppState, date = todayKey()): number {
  return state.waterEntries.filter((e) => e.date === date).reduce((s, e) => s + e.amountMl, 0)
}

export function stepsForDay(state: AppState, date = todayKey()): number {
  return state.stepsEntries.find((e) => e.date === date)?.steps ?? 0
}

export function workoutDoneToday(state: AppState, date = todayKey()): boolean {
  return state.workouts.some((w) => w.date === date && w.completed) ||
    state.runs.some((r) => r.date === date) ||
    state.simulations.some((s) => s.date === date && s.finishedAt)
}

export function sleepForDay(state: AppState, date = todayKey()) {
  return state.sleepEntries.find((e) => e.date === date) ?? null
}

export function todayPlan(state: AppState, date = new Date()): PlanDay {
  const wd = weekdayOf(date)
  return state.plan.find((p) => p.weekday === wd) ?? state.plan[0]
}

export function weekSessionStats(state: AppState): { done: number; planned: number } {
  const dates = weekDates()
  const planned = state.plan.filter((p) => p.targetMinutes !== null).length
  const done = dates.filter((d) => workoutDoneToday(state, d)).length
  return { done, planned }
}

export function computeStreak(state: AppState): number {
  let streak = 0
  const cursor = new Date()
  for (let i = 0; i < 365; i++) {
    const key = todayKey(cursor)
    const plan = todayPlan(state, cursor)
    const isRest = plan.targetMinutes === null
    const trained = workoutDoneToday(state, key)
    if (trained) {
      streak++
    } else if (isRest) {
      // rest days don't break streak
    } else if (i === 0) {
      // today not done yet — don't break
    } else {
      break
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function habitStatus(state: AppState, habit: HabitKey, date = todayKey()): boolean {
  const tick = state.habitTicks.find((h) => h.date === date && h.habit === habit)
  if (tick) return tick.done

  switch (habit) {
    case 'workout':
      return workoutDoneToday(state, date)
    case 'protein':
      return macrosForDay(state, date).protein >= state.profile.proteinTarget * 0.9
    case 'hydration':
      return waterForDay(state, date) >= state.profile.waterTargetMl * 0.9
    case 'steps':
      return stepsForDay(state, date) >= state.profile.stepsTarget
    case 'sleep': {
      const sleep = sleepForDay(state, date)
      return !!sleep && sleep.hours >= state.profile.sleepTargetHours * 0.9
    }
    default:
      return false
  }
}

export function workoutVolume(workout: Workout): number {
  return workout.sets.reduce((s, set) => s + set.weight * set.reps, 0)
}

export function lastSetsForExercise(workouts: Workout[], exercise: string) {
  const sorted = [...workouts]
    .filter((w) => w.completed && w.sets.some((s) => s.exercise === exercise))
    .sort((a, b) => b.date.localeCompare(a.date))
  if (!sorted.length) return null
  const sets = sorted[0].sets.filter((s) => s.exercise === exercise)
  return { date: sorted[0].date, sets }
}

export function runPace(run: RunSession): number {
  if (run.distanceKm <= 0) return 0
  return run.timeSeconds / run.distanceKm
}

export function hyroxProjectedFinish(logs: HyroxStationLog[]): {
  totalSeconds: number
  weakest: { station: string; seconds: number; vsBaseline: number } | null
} {
  const recentByStation = new Map<string, number[]>()

  for (const log of logs) {
    if (log.simId) continue
    if (log.metricType !== 'time') continue
    const key = log.station
    const arr = recentByStation.get(key) ?? []
    arr.push(log.value)
    recentByStation.set(key, arr)
  }

  const stationSeconds: Record<string, number> = {}
  let weakest: { station: string; seconds: number; vsBaseline: number } | null = null

  // 8 runs
  const runTimes = recentByStation.get('Run') ?? []
  const avgRun =
    runTimes.length > 0
      ? runTimes.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, runTimes.length)
      : HYROX_BASELINE_SECONDS.Run
  stationSeconds.Run = avgRun
  let total = avgRun * 8

  for (const station of HYROX_STATIONS) {
    const times = recentByStation.get(station) ?? []
    const avg =
      times.length > 0
        ? times.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, times.length)
        : HYROX_BASELINE_SECONDS[station]
    stationSeconds[station] = avg
    total += avg
    const baseline = HYROX_BASELINE_SECONDS[station]
    const ratio = avg / baseline
    if (!weakest || ratio > weakest.vsBaseline) {
      weakest = { station, seconds: avg, vsBaseline: ratio }
    }
  }

  return { totalSeconds: Math.round(total), weakest }
}

export function foodEntryMacros(state: AppState, entry: FoodEntry) {
  const food = state.foodLibrary.find((f) => f.id === entry.foodItemId)
  if (!food) return { protein: 0, carbs: 0, fat: 0, calories: 0 }
  return {
    protein: food.protein * entry.servings,
    carbs: food.carbs * entry.servings,
    fat: food.fat * entry.servings,
    calories: food.calories * entry.servings,
  }
}

export function consistencyHeatmap(
  state: AppState,
  days = 84,
): { date: string; level: 0 | 1 | 2 | 3 }[] {
  const result: { date: string; level: 0 | 1 | 2 | 3 }[] = []
  const cursor = new Date()
  cursor.setDate(cursor.getDate() - (days - 1))
  for (let i = 0; i < days; i++) {
    const key = todayKey(cursor)
    const trained = workoutDoneToday(state, key)
    const protein = macrosForDay(state, key).protein >= state.profile.proteinTarget * 0.8
    const water = waterForDay(state, key) >= state.profile.waterTargetMl * 0.8
    let level: 0 | 1 | 2 | 3 = 0
    if (trained && protein && water) level = 3
    else if (trained) level = 2
    else if (protein || water) level = 1
    result.push({ date: key, level })
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

export function findPRs(workouts: Workout[], exercise: string): number {
  let max = 0
  for (const w of workouts) {
    for (const s of w.sets) {
      if (s.exercise === exercise) {
        const vol = s.weight * s.reps
        if (vol > max) max = vol
      }
    }
  }
  return max
}
