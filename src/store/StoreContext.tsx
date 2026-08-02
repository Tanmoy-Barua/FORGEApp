import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from 'firebase/auth'
import type {
  AppState,
  BodyCompEntry,
  FoodEntry,
  HabitKey,
  HabitTick,
  HyroxSimulation,
  HyroxStationLog,
  MealSlot,
  Measurement,
  ProgressPhoto,
  RunSession,
  SleepEntry,
  SleepQuality,
  StepsEntry,
  WaterEntry,
  WeightEntry,
  Workout,
  ExerciseSet,
  Profile,
  WorkoutType,
} from '../types'
import { createInitialState, loadState, saveState } from './storage'
import { uid, todayKey } from '../utils/dates'
import {
  isFirebaseConfigured,
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
  watchAuth,
} from '../lib/auth'
import {
  connectFirebase,
  disconnectFirebase,
  getResolvedConfig,
  parseFirebaseConfigPaste,
  type FirebaseWebConfig,
} from '../lib/firebase'
import { mergeCloudState, pushUserState, subscribeUserState } from '../lib/cloudSync'

export type SyncStatus = 'disabled' | 'signed_out' | 'syncing' | 'synced' | 'error'

type Action =
  | { type: 'HYDRATE'; state: AppState }
  | { type: 'RESET' }
  | { type: 'UPDATE_PROFILE'; patch: Partial<Profile> }
  | { type: 'ADD_WATER'; amountMl: number; date?: string }
  | { type: 'ADD_WEIGHT'; kg: number; date?: string }
  | { type: 'ADD_STEPS'; steps: number; date?: string }
  | { type: 'ADD_SLEEP'; hours: number; quality: SleepQuality; date?: string }
  | { type: 'ADD_FOOD'; mealSlot: MealSlot; foodItemId: string; servings: number; date?: string }
  | { type: 'ADD_MEAL_TEMPLATE'; templateId: string; mealSlot: MealSlot; date?: string }
  | { type: 'REMOVE_FOOD'; id: string }
  | { type: 'TOGGLE_HABIT'; habit: HabitKey; date?: string }
  | { type: 'START_WORKOUT'; workoutType: WorkoutType; id?: string }
  | { type: 'ADD_EXERCISE'; workoutId: string; exercise: string }
  | {
      type: 'LOG_SET'
      workoutId: string
      exercise: string
      weight: number
      reps: number
      rpe: number
    }
  | { type: 'REPEAT_LAST_SET'; workoutId: string; exercise: string }
  | { type: 'FINISH_WORKOUT'; workoutId: string; durationMinutes: number; notes?: string }
  | { type: 'CANCEL_WORKOUT'; workoutId: string }
  | { type: 'ADD_RUN'; run: Omit<RunSession, 'id'> }
  | { type: 'ADD_HYROX_LOG'; log: Omit<HyroxStationLog, 'id'> }
  | { type: 'START_SIM'; id?: string }
  | { type: 'LOG_SIM_SPLIT'; stationIndex: number; value: number }
  | { type: 'FINISH_SIM'; notes?: string }
  | { type: 'ADD_MEASUREMENT'; measurementType: Measurement['type']; valueCm: number; date?: string }
  | { type: 'ADD_BODY_COMP'; leanMassKg: number; bodyFatPct: number; date?: string }
  | { type: 'ADD_PHOTO'; localDataUrl: string; note?: string; date?: string }
  | { type: 'REMOVE_PHOTO'; id: string }
  | { type: 'IMPORT_STATE'; state: AppState }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return action.state
    case 'RESET':
      return createInitialState()
    case 'IMPORT_STATE':
      return action.state
    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.patch } }
    case 'ADD_WATER': {
      const entry: WaterEntry = {
        id: uid('water'),
        date: action.date ?? todayKey(),
        amountMl: action.amountMl,
        createdAt: new Date().toISOString(),
      }
      return { ...state, waterEntries: [...state.waterEntries, entry] }
    }
    case 'ADD_WEIGHT': {
      const date = action.date ?? todayKey()
      const existing = state.weightEntries.find((w) => w.date === date)
      const entry: WeightEntry = { id: existing?.id ?? uid('weight'), date, kg: action.kg }
      return {
        ...state,
        weightEntries: existing
          ? state.weightEntries.map((w) => (w.date === date ? entry : w))
          : [...state.weightEntries, entry],
      }
    }
    case 'ADD_STEPS': {
      const date = action.date ?? todayKey()
      const existing = state.stepsEntries.find((s) => s.date === date)
      const entry: StepsEntry = { id: existing?.id ?? uid('steps'), date, steps: action.steps }
      return {
        ...state,
        stepsEntries: existing
          ? state.stepsEntries.map((s) => (s.date === date ? entry : s))
          : [...state.stepsEntries, entry],
      }
    }
    case 'ADD_SLEEP': {
      const date = action.date ?? todayKey()
      const existing = state.sleepEntries.find((s) => s.date === date)
      const entry: SleepEntry = {
        id: existing?.id ?? uid('sleep'),
        date,
        hours: action.hours,
        quality: action.quality,
      }
      return {
        ...state,
        sleepEntries: existing
          ? state.sleepEntries.map((s) => (s.date === date ? entry : s))
          : [...state.sleepEntries, entry],
      }
    }
    case 'ADD_FOOD': {
      const entry: FoodEntry = {
        id: uid('food'),
        date: action.date ?? todayKey(),
        mealSlot: action.mealSlot,
        foodItemId: action.foodItemId,
        servings: action.servings,
      }
      return { ...state, foodEntries: [...state.foodEntries, entry] }
    }
    case 'ADD_MEAL_TEMPLATE': {
      const tpl = state.mealTemplates.find((t) => t.id === action.templateId)
      if (!tpl) return state
      const date = action.date ?? todayKey()
      const entries: FoodEntry[] = tpl.items.map((item) => ({
        id: uid('food'),
        date,
        mealSlot: action.mealSlot,
        foodItemId: item.foodItemId,
        servings: item.servings,
      }))
      return { ...state, foodEntries: [...state.foodEntries, ...entries] }
    }
    case 'REMOVE_FOOD':
      return { ...state, foodEntries: state.foodEntries.filter((e) => e.id !== action.id) }
    case 'TOGGLE_HABIT': {
      const date = action.date ?? todayKey()
      const existing = state.habitTicks.find((h) => h.date === date && h.habit === action.habit)
      if (existing) {
        return {
          ...state,
          habitTicks: state.habitTicks.map((h) =>
            h.id === existing.id ? { ...h, done: !h.done } : h,
          ),
        }
      }
      const tick: HabitTick = {
        id: uid('habit'),
        date,
        habit: action.habit,
        done: true,
      }
      return { ...state, habitTicks: [...state.habitTicks, tick] }
    }
    case 'START_WORKOUT': {
      const workout: Workout = {
        id: action.id ?? uid('workout'),
        date: todayKey(),
        type: action.workoutType,
        durationMinutes: 0,
        notes: '',
        sets: [],
        completed: false,
      }
      return {
        ...state,
        workouts: [...state.workouts, workout],
        activeWorkoutId: workout.id,
      }
    }
    case 'ADD_EXERCISE': {
      // no-op placeholder — exercises appear when first set is logged
      return state
    }
    case 'LOG_SET': {
      const workout = state.workouts.find((w) => w.id === action.workoutId)
      if (!workout) return state
      const existingSets = workout.sets.filter((s) => s.exercise === action.exercise)
      const set: ExerciseSet = {
        id: uid('set'),
        exercise: action.exercise,
        setNumber: existingSets.length + 1,
        weight: action.weight,
        reps: action.reps,
        rpe: action.rpe,
      }
      return {
        ...state,
        workouts: state.workouts.map((w) =>
          w.id === action.workoutId ? { ...w, sets: [...w.sets, set] } : w,
        ),
      }
    }
    case 'REPEAT_LAST_SET': {
      const workout = state.workouts.find((w) => w.id === action.workoutId)
      if (!workout) return state
      const last = [...workout.sets].reverse().find((s) => s.exercise === action.exercise)
      if (!last) return state
      const set: ExerciseSet = {
        ...last,
        id: uid('set'),
        setNumber: workout.sets.filter((s) => s.exercise === action.exercise).length + 1,
      }
      return {
        ...state,
        workouts: state.workouts.map((w) =>
          w.id === action.workoutId ? { ...w, sets: [...w.sets, set] } : w,
        ),
      }
    }
    case 'FINISH_WORKOUT': {
      return {
        ...state,
        workouts: state.workouts.map((w) =>
          w.id === action.workoutId
            ? {
                ...w,
                completed: true,
                durationMinutes: action.durationMinutes,
                notes: action.notes ?? w.notes,
              }
            : w,
        ),
        activeWorkoutId:
          state.activeWorkoutId === action.workoutId ? null : state.activeWorkoutId,
      }
    }
    case 'CANCEL_WORKOUT': {
      return {
        ...state,
        workouts: state.workouts.filter((w) => w.id !== action.workoutId),
        activeWorkoutId:
          state.activeWorkoutId === action.workoutId ? null : state.activeWorkoutId,
      }
    }
    case 'ADD_RUN': {
      const run: RunSession = { ...action.run, id: uid('run') }
      return { ...state, runs: [...state.runs, run] }
    }
    case 'ADD_HYROX_LOG': {
      const log: HyroxStationLog = { ...action.log, id: uid('hyrox') }
      return { ...state, hyroxLogs: [...state.hyroxLogs, log] }
    }
    case 'START_SIM': {
      const sim: HyroxSimulation = {
        id: action.id ?? uid('sim'),
        date: todayKey(),
        startedAt: new Date().toISOString(),
        finishedAt: null,
        totalSeconds: null,
        notes: '',
      }
      return {
        ...state,
        simulations: [...state.simulations, sim],
        activeSimId: sim.id,
      }
    }
    case 'LOG_SIM_SPLIT': {
      if (!state.activeSimId) return state
      const seq = action.stationIndex
      // station name resolved by caller via log payload pattern — store minimal
      const existing = state.hyroxLogs.find(
        (l) => l.simId === state.activeSimId && l.stationIndex === seq,
      )
      if (existing) {
        return {
          ...state,
          hyroxLogs: state.hyroxLogs.map((l) =>
            l.id === existing.id ? { ...l, value: action.value } : l,
          ),
        }
      }
      // Caller should use ADD_HYROX_LOG for full data; this is fallback
      return state
    }
    case 'FINISH_SIM': {
      if (!state.activeSimId) return state
      const sim = state.simulations.find((s) => s.id === state.activeSimId)
      if (!sim) return state
      const splits = state.hyroxLogs.filter((l) => l.simId === state.activeSimId)
      const total = splits.reduce((s, l) => s + (l.metricType === 'time' ? l.value : 0), 0)
      return {
        ...state,
        simulations: state.simulations.map((s) =>
          s.id === state.activeSimId
            ? {
                ...s,
                finishedAt: new Date().toISOString(),
                totalSeconds: total,
                notes: action.notes ?? '',
              }
            : s,
        ),
        activeSimId: null,
        workouts: [
          ...state.workouts,
          {
            id: uid('workout'),
            date: todayKey(),
            type: 'sim',
            durationMinutes: Math.round(total / 60),
            notes: action.notes ?? 'HYROX simulation',
            sets: [],
            completed: true,
          },
        ],
      }
    }
    case 'ADD_MEASUREMENT': {
      const entry: Measurement = {
        id: uid('meas'),
        date: action.date ?? todayKey(),
        type: action.measurementType,
        valueCm: action.valueCm,
      }
      return { ...state, measurements: [...state.measurements, entry] }
    }
    case 'ADD_BODY_COMP': {
      const entry: BodyCompEntry = {
        id: uid('bc'),
        date: action.date ?? todayKey(),
        leanMassKg: action.leanMassKg,
        bodyFatPct: action.bodyFatPct,
      }
      return { ...state, bodyComp: [...state.bodyComp, entry] }
    }
    case 'ADD_PHOTO': {
      const entry: ProgressPhoto = {
        id: uid('photo'),
        date: action.date ?? todayKey(),
        localDataUrl: action.localDataUrl,
        note: action.note ?? '',
      }
      return { ...state, progressPhotos: [...state.progressPhotos, entry] }
    }
    case 'REMOVE_PHOTO':
      return {
        ...state,
        progressPhotos: state.progressPhotos.filter((p) => p.id !== action.id),
      }
    default:
      return state
  }
}

interface StoreApi {
  state: AppState
  ready: boolean
  dispatch: React.Dispatch<Action>
  cloudEnabled: boolean
  cloudProjectId: string | null
  user: User | null
  syncStatus: SyncStatus
  syncError: string | null
  connectCloud: (paste: string) => Promise<void>
  disconnectCloud: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  addWater: (ml?: number) => void
  addWeight: (kg: number) => void
  addSteps: (steps: number) => void
  addSleep: (hours: number, quality: SleepQuality) => void
  addFood: (mealSlot: MealSlot, foodItemId: string, servings?: number) => void
  addMealTemplate: (templateId: string, mealSlot: MealSlot) => void
  removeFood: (id: string) => void
  toggleHabit: (habit: HabitKey) => void
  startWorkout: (type?: WorkoutType) => string
  logSet: (
    workoutId: string,
    exercise: string,
    weight: number,
    reps: number,
    rpe: number,
  ) => void
  repeatLastSet: (workoutId: string, exercise: string) => void
  finishWorkout: (workoutId: string, durationMinutes: number, notes?: string) => void
  cancelWorkout: (workoutId: string) => void
  addRun: (run: Omit<RunSession, 'id'>) => void
  addHyroxLog: (log: Omit<HyroxStationLog, 'id'>) => void
  startSim: () => string
  finishSim: (notes?: string) => void
  updateProfile: (patch: Partial<Profile>) => void
  addMeasurement: (type: Measurement['type'], valueCm: number) => void
  addBodyComp: (leanMassKg: number, bodyFatPct: number) => void
  addPhoto: (dataUrl: string, note?: string) => void
  removePhoto: (id: string) => void
  resetAll: () => void
  importState: (state: AppState) => void
}

const StoreContext = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const [ready, setReady] = useState(false)
  const [configEpoch, setConfigEpoch] = useState(0)
  const cloudEnabled = isFirebaseConfigured()
  const cloudProjectId = getResolvedConfig()?.projectId ?? null
  const [user, setUser] = useState<User | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disabled')
  const [syncError, setSyncError] = useState<string | null>(null)
  const applyingRemote = useRef(false)
  const lastPushedAt = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    dispatch({ type: 'HYDRATE', state: loadState() })
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) saveState(state)
  }, [state, ready])

  useEffect(() => {
    if (!cloudEnabled) {
      setUser(null)
      setSyncStatus('disabled')
      return
    }
    setSyncStatus('signed_out')
    return watchAuth(
      (next) => {
        setUser(next)
        setSyncStatus(next ? 'syncing' : 'signed_out')
        setSyncError(null)
      },
      (err) => {
        setSyncError(err.message)
        setSyncStatus('error')
      },
    )
  }, [cloudEnabled, configEpoch])

  useEffect(() => {
    if (!cloudEnabled || !user || !ready) return

    setSyncStatus('syncing')
    const unsub = subscribeUserState(
      user.uid,
      (remote, updatedAt) => {
        if (!remote) {
          // Seed cloud with current local state
          void pushUserState(user.uid, stateRef.current)
            .then(() => {
              lastPushedAt.current = Date.now()
              setSyncStatus('synced')
            })
            .catch((err: Error) => {
              setSyncError(err.message)
              setSyncStatus('error')
            })
          return
        }

        // Ignore echo of our own recent push
        if (updatedAt && updatedAt <= lastPushedAt.current + 50) {
          setSyncStatus('synced')
          return
        }

        applyingRemote.current = true
        const merged = mergeCloudState(remote, stateRef.current)
        dispatch({ type: 'HYDRATE', state: merged })
        setSyncStatus('synced')
        setSyncError(null)
      },
      (err) => {
        setSyncError(err.message)
        setSyncStatus('error')
      },
    )
    return unsub
  }, [cloudEnabled, user, ready])

  useEffect(() => {
    if (!ready || !cloudEnabled || !user) return
    if (applyingRemote.current) {
      applyingRemote.current = false
      return
    }

    setSyncStatus('syncing')
    const timer = window.setTimeout(() => {
      void pushUserState(user.uid, state)
        .then(() => {
          lastPushedAt.current = Date.now()
          setSyncStatus('synced')
          setSyncError(null)
        })
        .catch((err: Error) => {
          setSyncError(err.message)
          setSyncStatus('error')
        })
    }, 900)
    return () => window.clearTimeout(timer)
  }, [state, ready, cloudEnabled, user])

  const signIn = useCallback(async (email: string, password: string) => {
    setSyncError(null)
    setSyncStatus('syncing')
    try {
      await authSignIn(email, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed'
      setSyncError(message)
      setSyncStatus('error')
      throw err
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    setSyncError(null)
    setSyncStatus('syncing')
    try {
      await authSignUp(email, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-up failed'
      setSyncError(message)
      setSyncStatus('error')
      throw err
    }
  }, [])

  const signOut = useCallback(async () => {
    await authSignOut()
    setSyncStatus(cloudEnabled ? 'signed_out' : 'disabled')
  }, [cloudEnabled])

  const connectCloud = useCallback(async (paste: string) => {
    setSyncError(null)
    const config: FirebaseWebConfig = parseFirebaseConfigPaste(paste)
    try {
      await authSignOut()
    } catch {
      // ignore if not signed in
    }
    await connectFirebase(config)
    setConfigEpoch((n) => n + 1)
    setSyncStatus('signed_out')
  }, [])

  const disconnectCloud = useCallback(async () => {
    try {
      await authSignOut()
    } catch {
      // ignore
    }
    await disconnectFirebase()
    setUser(null)
    setSyncError(null)
    setSyncStatus('disabled')
    setConfigEpoch((n) => n + 1)
  }, [])

  const addWater = useCallback((ml = 250) => {
    dispatch({ type: 'ADD_WATER', amountMl: ml })
  }, [])

  const addWeight = useCallback((kg: number) => {
    dispatch({ type: 'ADD_WEIGHT', kg })
  }, [])

  const addSteps = useCallback((steps: number) => {
    dispatch({ type: 'ADD_STEPS', steps })
  }, [])

  const addSleep = useCallback((hours: number, quality: SleepQuality) => {
    dispatch({ type: 'ADD_SLEEP', hours, quality })
  }, [])

  const addFood = useCallback((mealSlot: MealSlot, foodItemId: string, servings = 1) => {
    dispatch({ type: 'ADD_FOOD', mealSlot, foodItemId, servings })
  }, [])

  const addMealTemplate = useCallback((templateId: string, mealSlot: MealSlot) => {
    dispatch({ type: 'ADD_MEAL_TEMPLATE', templateId, mealSlot })
  }, [])

  const removeFood = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FOOD', id })
  }, [])

  const toggleHabit = useCallback((habit: HabitKey) => {
    dispatch({ type: 'TOGGLE_HABIT', habit })
  }, [])

  const startWorkout = useCallback((type: WorkoutType = 'strength') => {
    const id = uid('workout')
    dispatch({ type: 'START_WORKOUT', workoutType: type, id })
    return id
  }, [])

  const logSet = useCallback(
    (workoutId: string, exercise: string, weight: number, reps: number, rpe: number) => {
      dispatch({ type: 'LOG_SET', workoutId, exercise, weight, reps, rpe })
    },
    [],
  )

  const repeatLastSet = useCallback((workoutId: string, exercise: string) => {
    dispatch({ type: 'REPEAT_LAST_SET', workoutId, exercise })
  }, [])

  const finishWorkout = useCallback(
    (workoutId: string, durationMinutes: number, notes?: string) => {
      dispatch({ type: 'FINISH_WORKOUT', workoutId, durationMinutes, notes })
    },
    [],
  )

  const cancelWorkout = useCallback((workoutId: string) => {
    dispatch({ type: 'CANCEL_WORKOUT', workoutId })
  }, [])

  const addRun = useCallback((run: Omit<RunSession, 'id'>) => {
    dispatch({ type: 'ADD_RUN', run })
  }, [])

  const addHyroxLog = useCallback((log: Omit<HyroxStationLog, 'id'>) => {
    dispatch({ type: 'ADD_HYROX_LOG', log })
  }, [])

  const startSim = useCallback(() => {
    const id = uid('sim')
    dispatch({ type: 'START_SIM', id })
    return id
  }, [])

  const finishSim = useCallback((notes?: string) => {
    dispatch({ type: 'FINISH_SIM', notes })
  }, [])

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    dispatch({ type: 'UPDATE_PROFILE', patch })
  }, [])

  const addMeasurement = useCallback((measurementType: Measurement['type'], valueCm: number) => {
    dispatch({ type: 'ADD_MEASUREMENT', measurementType, valueCm })
  }, [])

  const addBodyComp = useCallback((leanMassKg: number, bodyFatPct: number) => {
    dispatch({ type: 'ADD_BODY_COMP', leanMassKg, bodyFatPct })
  }, [])

  const addPhoto = useCallback((dataUrl: string, note?: string) => {
    dispatch({ type: 'ADD_PHOTO', localDataUrl: dataUrl, note })
  }, [])

  const removePhoto = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_PHOTO', id })
  }, [])

  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const importState = useCallback((next: AppState) => {
    dispatch({ type: 'IMPORT_STATE', state: next })
  }, [])

  const api = useMemo<StoreApi>(
    () => ({
      state,
      ready,
      dispatch,
      cloudEnabled,
      cloudProjectId,
      user,
      syncStatus,
      syncError,
      connectCloud,
      disconnectCloud,
      signIn,
      signUp,
      signOut,
      addWater,
      addWeight,
      addSteps,
      addSleep,
      addFood,
      addMealTemplate,
      removeFood,
      toggleHabit,
      startWorkout,
      logSet,
      repeatLastSet,
      finishWorkout,
      cancelWorkout,
      addRun,
      addHyroxLog,
      startSim,
      finishSim,
      updateProfile,
      addMeasurement,
      addBodyComp,
      addPhoto,
      removePhoto,
      resetAll,
      importState,
    }),
    [
      state,
      ready,
      cloudEnabled,
      cloudProjectId,
      user,
      syncStatus,
      syncError,
      connectCloud,
      disconnectCloud,
      signIn,
      signUp,
      signOut,
      addWater,
      addWeight,
      addSteps,
      addSleep,
      addFood,
      addMealTemplate,
      removeFood,
      toggleHabit,
      startWorkout,
      logSet,
      repeatLastSet,
      finishWorkout,
      cancelWorkout,
      addRun,
      addHyroxLog,
      startSim,
      finishSim,
      updateProfile,
      addMeasurement,
      addBodyComp,
      addPhoto,
      removePhoto,
      resetAll,
      importState,
    ],
  )

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
