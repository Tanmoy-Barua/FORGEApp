export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export type WorkoutType = 'strength' | 'run' | 'hyrox' | 'sim' | 'walk'

export type MealSlot = 'breakfast' | 'lunch' | 'preworkout' | 'dinner' | 'snack'

export type HabitKey = 'workout' | 'protein' | 'hydration' | 'steps' | 'sleep'

export type SleepQuality = 'poor' | 'ok' | 'good' | 'great'

export type FoodTag = 'preferred' | 'avoid' | 'lactose' | 'lactose-free'

export type MeasurementType = 'waist' | 'hips' | 'chest' | 'arms' | 'thighs'

export type HyroxStation =
  | 'SkiErg'
  | 'Sled Push'
  | 'Sled Pull'
  | 'Burpee Broad Jumps'
  | 'Rowing'
  | 'Farmers Carry'
  | 'Sandbag Lunges'
  | 'Wall Balls'

export interface Profile {
  name: string
  startWeight: number
  targetWeight: number
  raceName: string
  raceDate: string
  programStart: string
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
  calorieTarget: number
  waterTargetMl: number
  stepsTarget: number
  sleepTargetHours: number
}

export interface PlanBlock {
  name: string
  exercises: string[]
  notes?: string
}

export interface PlanDay {
  weekday: Weekday
  focus: string
  targetMinutes: number | null
  blocks: PlanBlock[]
}

export interface ExerciseSet {
  id: string
  exercise: string
  setNumber: number
  weight: number
  reps: number
  rpe: number
}

export interface Workout {
  id: string
  date: string
  type: WorkoutType
  durationMinutes: number
  notes: string
  sets: ExerciseSet[]
  completed: boolean
}

export interface RunSession {
  id: string
  date: string
  distanceKm: number
  timeSeconds: number
  intervals: boolean
  effort: number
  routeNote: string
}

export interface HyroxStationLog {
  id: string
  date: string
  station: HyroxStation | 'Run'
  stationIndex: number
  metricType: 'time' | 'reps' | 'weight'
  value: number
  unit: string
  simId: string | null
}

export interface HyroxSimulation {
  id: string
  date: string
  startedAt: string
  finishedAt: string | null
  totalSeconds: number | null
  notes: string
}

export interface FoodItem {
  id: string
  name: string
  servingLabel: string
  protein: number
  carbs: number
  fat: number
  calories: number
  tags: FoodTag[]
}

export interface FoodEntry {
  id: string
  date: string
  mealSlot: MealSlot
  foodItemId: string
  servings: number
}

export interface MealTemplate {
  id: string
  name: string
  items: { foodItemId: string; servings: number }[]
}

export interface WaterEntry {
  id: string
  date: string
  amountMl: number
  createdAt: string
}

export interface WeightEntry {
  id: string
  date: string
  kg: number
}

export interface Measurement {
  id: string
  date: string
  type: MeasurementType
  valueCm: number
}

export interface BodyCompEntry {
  id: string
  date: string
  leanMassKg: number
  bodyFatPct: number
}

export type WearableSource = 'manual' | 'whoop' | 'apple_health'

export interface SleepEntry {
  id: string
  date: string
  hours: number
  quality: SleepQuality
  source?: WearableSource
  performancePct?: number
}

export interface RecoveryEntry {
  id: string
  date: string
  score: number
  hrvMs?: number
  restingHr?: number
  strain?: number
  source: WearableSource
}

export interface HabitTick {
  id: string
  date: string
  habit: HabitKey
  done: boolean
}

export interface ProgressPhoto {
  id: string
  date: string
  localDataUrl: string
  note: string
}

export interface StepsEntry {
  id: string
  date: string
  steps: number
}

export interface AppState {
  profile: Profile
  plan: PlanDay[]
  workouts: Workout[]
  runs: RunSession[]
  hyroxLogs: HyroxStationLog[]
  simulations: HyroxSimulation[]
  foodLibrary: FoodItem[]
  foodEntries: FoodEntry[]
  mealTemplates: MealTemplate[]
  waterEntries: WaterEntry[]
  weightEntries: WeightEntry[]
  measurements: Measurement[]
  bodyComp: BodyCompEntry[]
  sleepEntries: SleepEntry[]
  recoveryEntries: RecoveryEntry[]
  habitTicks: HabitTick[]
  progressPhotos: ProgressPhoto[]
  stepsEntries: StepsEntry[]
  activeWorkoutId: string | null
  activeSimId: string | null
}
