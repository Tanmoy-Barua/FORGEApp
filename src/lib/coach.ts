import { addDays } from 'date-fns'
import type { AppState, PlanDay, WorkoutType } from '../types'
import type { WhoopCache, WhoopCycle, WhoopRecovery, WhoopSleep } from './whoop'
import { milliToHours, recoveryZone, sleepHoursFromWhoop } from './whoop'
import { daysUntil, todayKey } from '../utils/dates'
import { latestWeight, todayPlan, workoutDoneToday } from '../utils/calculations'

export type CoachIntensity = 'rest' | 'easy' | 'moderate' | 'hard' | 'race'

export type CoachMove = {
  title: string
  headline: string
  action: string
  rationale: string[]
  intensity: CoachIntensity
  planFocus: string
  adjusted: boolean
  badges: string[]
  cta: {
    label: string
    to: string
    workoutType?: WorkoutType
  }
  metrics: {
    recovery: number | null
    strain: number | null
    sleepHours: number | null
    sleepPerf: number | null
    daysToRace: number
    zone: ReturnType<typeof recoveryZone>
  }
}

function avgStrain(cycles: WhoopCycle[], n = 3): number | null {
  const scored = cycles.filter((c) => c.score?.strain != null).slice(0, n)
  if (!scored.length) return null
  return scored.reduce((s, c) => s + (c.score?.strain ?? 0), 0) / scored.length
}

function racePhase(days: number): 'base' | 'build' | 'peak' | 'taper' | 'race' | 'post' {
  if (days < 0) return 'post'
  if (days === 0) return 'race'
  if (days <= 7) return 'taper'
  if (days <= 21) return 'peak'
  if (days <= 42) return 'build'
  return 'base'
}

function phaseBadge(phase: ReturnType<typeof racePhase>, raceName: string): string {
  switch (phase) {
    case 'taper':
      return 'Taper week'
    case 'peak':
      return 'Peak block'
    case 'build':
      return 'Build block'
    case 'race':
      return `${raceName} day`
    case 'post':
      return 'Post-race'
    default:
      return 'Base block'
  }
}

function isRunDay(plan: PlanDay): boolean {
  return plan.focus.toLowerCase().includes('run')
}

function isSimDay(plan: PlanDay): boolean {
  return plan.weekday === 'Sat' || plan.focus.toLowerCase().includes('sim')
}

function isRestDay(plan: PlanDay): boolean {
  return plan.targetMinutes == null
}

function ctaFor(
  intensity: CoachIntensity,
  plan: PlanDay,
  trained: boolean,
): CoachMove['cta'] {
  if (trained || intensity === 'rest') {
    return { label: 'Open Race checklist', to: '/race' }
  }
  if (intensity === 'easy' && (isSimDay(plan) || !isRunDay(plan))) {
    return { label: 'Log easy session', to: '/train?tab=log', workoutType: 'walk' }
  }
  if (isSimDay(plan) && (intensity === 'hard' || intensity === 'race' || intensity === 'moderate')) {
    return { label: 'Open HYROX sim', to: '/train?tab=hyrox', workoutType: 'hyrox' }
  }
  if (isRunDay(plan) || intensity === 'easy') {
    return { label: 'Log run', to: '/train?tab=log', workoutType: 'run' }
  }
  return { label: 'Start session', to: '/train?tab=log', workoutType: 'strength' }
}

export function buildNextMove(
  state: AppState,
  cache: WhoopCache | null,
  opts?: {
    recovery?: WhoopRecovery | null
    cycle?: WhoopCycle | null
    sleep?: WhoopSleep | null
  },
): CoachMove {
  const plan = todayPlan(state)
  const trained = workoutDoneToday(state)
  const daysToRace = daysUntil(state.profile.raceDate)
  const phase = racePhase(daysToRace)
  const recovery = opts?.recovery ?? cache?.recoveries?.[0] ?? null
  const cycle =
    opts?.cycle ??
    (recovery
      ? cache?.cycles.find((c) => c.id === recovery.cycle_id) ?? cache?.cycles?.[0] ?? null
      : cache?.cycles?.[0] ?? null)
  const sleep =
    opts?.sleep ??
    (recovery?.sleep_id
      ? cache?.sleeps.find((s) => s.id === recovery.sleep_id) ?? null
      : cache?.sleeps.filter((s) => !s.nap)[0] ?? null)

  const recoveryScore = recovery?.score?.recovery_score ?? null
  const zone = recoveryZone(recoveryScore ?? undefined)
  const strain = cycle?.score?.strain ?? null
  const sleepHours = sleep ? sleepHoursFromWhoop(sleep) : null
  const sleepPerf = sleep?.score?.sleep_performance_percentage ?? null
  const sleepTarget = state.profile.sleepTargetHours
  const recentStrain = cache ? avgStrain(cache.cycles, 3) : null
  const weight = latestWeight(state.weightEntries)
  const weightGap =
    weight != null ? Math.round((weight.kg - state.profile.targetWeight) * 10) / 10 : null

  const badges: string[] = [phaseBadge(phase, state.profile.raceName)]
  if (zone !== 'none') badges.push(`Recovery ${zone}`)
  if (trained) badges.push('Session logged')

  const metrics: CoachMove['metrics'] = {
    recovery: recoveryScore,
    strain,
    sleepHours,
    sleepPerf,
    daysToRace,
    zone,
  }

  const rationale: string[] = []
  let title = 'Next move'
  let headline = ''
  let action = ''
  let intensity: CoachIntensity = 'moderate'
  let adjusted = false
  let planFocus = plan.focus

  // No wearable signal yet
  if (!cache || zone === 'none') {
    title = 'Connect the signal'
    headline = 'Sync Whoop to coach today’s session'
    action = isRestDay(plan)
      ? `Plan says rest. Optional 20–30 min walk, then hit protein (${state.profile.proteinTarget}g) and sleep (${sleepTarget}h).`
      : `Until Whoop syncs, follow today’s plan lightly: ${plan.focus}${
          plan.targetMinutes ? ` · ~${plan.targetMinutes} min` : ''
        }.`
    intensity = isRestDay(plan) ? 'rest' : 'easy'
    rationale.push('No fresh recovery score yet — coaching stays conservative.')
    rationale.push(`${state.profile.raceName} in ${Math.max(0, daysToRace)} days.`)
    return {
      title,
      headline,
      action,
      rationale,
      intensity,
      planFocus,
      adjusted: true,
      badges: [...badges, 'Needs sync'],
      cta: cache
        ? ctaFor(intensity, plan, trained)
        : { label: 'Connect / Sync Whoop', to: '/' },
      metrics,
    }
  }

  // Already trained — recovery / fuel next
  if (trained) {
    title = 'Protect the gain'
    if (strain != null && strain >= 14) {
      headline = 'Hard day in the bank — recover hard'
      action = `Prioritize ${sleepTarget}+ hours sleep, full protein target (${state.profile.proteinTarget}g), and ${Math.round(state.profile.waterTargetMl / 1000)}L water. Skip extra intensity.`
      intensity = 'rest'
      rationale.push(`Day strain is ${strain.toFixed(1)} — body needs the rebuild window.`)
    } else if (zone === 'red') {
      headline = 'Session done — now dig out of the red'
      action = 'Easy walk only if restless. Early lights-out, carbs around dinner, no late caffeine.'
      intensity = 'rest'
      rationale.push(`Recovery is ${recoveryScore}% — sleep is the main lever tonight.`)
    } else {
      headline = 'Session logged — stay on target'
      action = `Finish fuel (${state.profile.proteinTarget}g protein), hit steps if short, and lock ${sleepTarget}h sleep for tomorrow’s readiness.`
      intensity = 'easy'
      rationale.push('Training stimulus is covered — consistency now is nutrition + sleep.')
    }
    if (weightGap != null && weightGap > 0.5) {
      rationale.push(`Weight ${weightGap} kg above race target — keep the calorie plan steady, don’t slash hard today.`)
    }
    rationale.push(`${phaseBadge(phase, state.profile.raceName)} · ${Math.max(0, daysToRace)} days out.`)
    return {
      title,
      headline,
      action,
      rationale,
      intensity,
      planFocus,
      adjusted: false,
      badges,
      cta: { label: 'Open Race checklist', to: '/race' },
      metrics,
    }
  }

  // Race day
  if (phase === 'race') {
    title = 'Race day'
    headline =
      zone === 'red'
        ? 'Stay calm — execute, don’t invent intensity'
        : 'Trust the taper — race your plan'
    action =
      zone === 'red'
        ? 'Warm up longer, open controlled, protect transitions. No hero effort early.'
        : 'Light activation, familiar warm-up, then race HYROX as practiced.'
    intensity = 'race'
    rationale.push(
      zone === 'red'
        ? `Recovery ${recoveryScore}% — manage effort, don’t force a PR attempt.`
        : `Recovery ${recoveryScore}% — green light for race execution.`,
    )
    if (sleepHours != null && sleepHours < sleepTarget - 1) {
      rationale.push(`Sleep ${sleepHours}h under target — longer warm-up, steady pacing.`)
    }
    return {
      title,
      headline,
      action,
      rationale,
      intensity,
      planFocus: state.profile.raceName,
      adjusted: zone === 'red',
      badges,
      cta: { label: 'Open HYROX tracker', to: '/train?tab=hyrox', workoutType: 'hyrox' },
      metrics,
    }
  }

  // Rest day on plan
  if (isRestDay(plan)) {
    title = 'Recovery day'
    if (zone === 'green' && phase !== 'taper') {
      headline = 'Rest day with optional flush'
      action = '20–40 min easy walk + mobility. No intervals. Hit protein and sleep targets.'
      intensity = 'easy'
      rationale.push('Recovery is green, but the plan calls for rest — keep it flush, not training.')
    } else {
      headline = zone === 'red' ? 'Full stop — rebuild today' : 'Protect the rest day'
      action = 'No structured work. Walk only if it helps you unwind. Prioritize sleep and hydration.'
      intensity = 'rest'
      rationale.push(
        zone === 'red'
          ? `Recovery ${recoveryScore}% — rest is the training today.`
          : 'Planned rest day — don’t stack hidden strain.',
      )
    }
    if (recentStrain != null && recentStrain >= 12) {
      rationale.push(`3-day avg strain ${recentStrain.toFixed(1)} — you earned this unload.`)
    }
    rationale.push(`${Math.max(0, daysToRace)} days to ${state.profile.raceName}.`)
    return {
      title,
      headline,
      action,
      rationale,
      intensity,
      planFocus,
      adjusted: false,
      badges,
      cta: ctaFor(intensity, plan, false),
      metrics,
    }
  }

  // Taper week — protect freshness
  if (phase === 'taper') {
    title = 'Taper call'
    if (zone === 'red' || (sleepPerf != null && sleepPerf < 60)) {
      headline = 'Cut volume — freshness over grind'
      action = isSimDay(plan)
        ? 'Skip full sim. 20–30 min technique + easy jog only.'
        : `Slash today’s ${plan.focus} to ~40% volume, easy effort. Stop while it still feels light.`
      intensity = 'easy'
      adjusted = true
      planFocus = isSimDay(plan) ? 'Technique + easy jog' : `Easy version · ${plan.focus}`
      rationale.push(
        zone === 'red'
          ? `Recovery ${recoveryScore}% inside taper — race readiness > today’s strain.`
          : `Sleep performance ${sleepPerf}% — taper needs sleep more than another hard set.`,
      )
    } else if (zone === 'yellow') {
      headline = 'Keep the session, trim the edges'
      action = isSimDay(plan)
        ? 'Half-sim or station practice only. Cap strain — leave the tank for race day.'
        : `Do ${plan.focus}, but shorten intervals and keep RPE ≤ 6.`
      intensity = 'moderate'
      adjusted = true
      planFocus = isSimDay(plan) ? 'Half HYROX / stations' : plan.focus
      rationale.push(`Recovery ${recoveryScore}% — quality movement, limited dose.`)
    } else {
      headline = 'Green taper — sharp, not long'
      action = isSimDay(plan)
        ? 'Short race-pace primer or half-sim. Stop early. No grind.'
        : `Complete a crisp ${plan.focus} at planned intensity, then stop. Don’t add extras.`
      intensity = isSimDay(plan) ? 'moderate' : 'hard'
      adjusted = isSimDay(plan)
      planFocus = isSimDay(plan) ? 'Short HYROX primer' : plan.focus
      rationale.push(`Recovery ${recoveryScore}% — good day to stay sharp without dumping the taper.`)
    }
    rationale.push(`${daysToRace} days to ${state.profile.raceName}.`)
    return {
      title,
      headline,
      action,
      rationale,
      intensity,
      planFocus,
      adjusted,
      badges,
      cta: ctaFor(intensity, plan, false),
      metrics,
    }
  }

  // Red recovery — override plan
  if (zone === 'red') {
    title = 'Recovery override'
    headline = 'Body says no — rewrite today'
    if (isSimDay(plan)) {
      action = 'Postpone full sim. Easy 30–40 min aerobic + light station technique if you feel ok.'
      planFocus = 'Active recovery · postpone sim'
      intensity = 'easy'
    } else if (isRunDay(plan)) {
      action = 'Swap run for 25–35 min walk / very easy jog. Keep HR conversational.'
      planFocus = 'Easy aerobic only'
      intensity = 'easy'
    } else {
      action = 'Cut strength volume ~60%. Skip conditioning finisher. Mobility + core ok.'
      planFocus = `Deload · ${plan.focus}`
      intensity = 'easy'
    }
    adjusted = true
    rationale.push(`Recovery ${recoveryScore}% (red) — pushing hard now costs tomorrow.`)
    if (sleepHours != null && sleepHours < sleepTarget) {
      rationale.push(`Sleep ${sleepHours}h vs ${sleepTarget}h target — rebuild sleep first.`)
    }
    if (strain != null && strain >= 10) {
      rationale.push(`Strain already ${strain.toFixed(1)} today — don’t dig deeper.`)
    }
    rationale.push(`${Math.max(0, daysToRace)} days to ${state.profile.raceName}.`)
    return {
      title,
      headline,
      action,
      rationale,
      intensity,
      planFocus,
      adjusted,
      badges,
      cta: ctaFor(intensity, plan, false),
      metrics,
    }
  }

  // Yellow — proceed with guardrails
  if (zone === 'yellow') {
    title = 'Smart moderation'
    headline = 'Train, but don’t empty the tank'
    if (isSimDay(plan)) {
      action = 'Half-sim or 4–5 stations with controlled runs. Log splits, stop if form dies.'
      planFocus = 'Controlled half HYROX'
      intensity = 'moderate'
      adjusted = true
    } else if (isRunDay(plan)) {
      action = `Run as planned (~${plan.targetMinutes} min) but keep it easy-steady. No sprint finish.`
      intensity = 'moderate'
    } else {
      action = `Do ${plan.focus}. Keep top sets, cut burnout accessories / finisher if HRV feels flat.`
      intensity = 'moderate'
      adjusted = true
    }
    rationale.push(`Recovery ${recoveryScore}% (yellow) — stimulus yes, junk volume no.`)
    if (sleepPerf != null && sleepPerf < 75) {
      rationale.push(`Sleep performance ${Math.round(sleepPerf)}% — end the session while quality is still high.`)
    }
    if (weightGap != null && weightGap > 1) {
      rationale.push(`${weightGap} kg above target — fuel the session, stay in your calorie lane after.`)
    }
    rationale.push(`${Math.max(0, daysToRace)} days to ${state.profile.raceName}.`)
    return {
      title,
      headline,
      action,
      rationale,
      intensity,
      planFocus,
      adjusted,
      badges,
      cta: ctaFor(intensity, plan, false),
      metrics,
    }
  }

  // Green — go
  title = 'Green light'
  headline =
    phase === 'peak'
      ? 'Ready to push — race block quality'
      : 'Recovery supports the full plan'
  if (isSimDay(plan)) {
    action = 'Full HYROX simulation as written. Log every split. Race-pace transitions.'
    intensity = 'hard'
    planFocus = 'HYROX simulation'
  } else if (isRunDay(plan)) {
    action = `Full run session (~${plan.targetMinutes} min). Hold planned pace; finish strong if form stays clean.`
    intensity = 'hard'
  } else {
    action = `Full ${plan.focus}${plan.targetMinutes ? ` · ~${plan.targetMinutes} min` : ''}. Hit strength intent, then conditioning.`
    intensity = 'hard'
  }
  rationale.push(`Recovery ${recoveryScore}% (green) — good day to earn strain toward ${state.profile.raceName}.`)
  if (sleepHours != null) {
    rationale.push(`Sleep ${sleepHours}h${sleepPerf != null ? ` · performance ${Math.round(sleepPerf)}%` : ''}.`)
  }
  if (recentStrain != null && recentStrain < 8 && phase !== 'base') {
    rationale.push(`Recent strain avg ${recentStrain.toFixed(1)} — room to load today.`)
  }
  if (weightGap != null && weightGap > 1) {
    rationale.push(`Still ${weightGap} kg above ${state.profile.targetWeight} kg target — keep protein at ${state.profile.proteinTarget}g.`)
  }
  rationale.push(`${Math.max(0, daysToRace)} days out · ${todayKey()}.`)

  return {
    title,
    headline,
    action,
    rationale,
    intensity,
    planFocus,
    adjusted: false,
    badges,
    cta: ctaFor(intensity, plan, false),
    metrics,
  }
}

export type DailyTargets = {
  forDate: string
  forWeekday: string
  sleep: {
    hours: number
    bedtimeHint: string
    source: 'whoop' | 'profile'
    detail: string
    breakdown?: { baseline: number; debt: number; strain: number; nap: number }
  }
  workout: {
    minutes: number
    strainTarget: number
    focus: string
    intensity: CoachIntensity
    detail: string
    adjusted: boolean
  }
  fuel: {
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    waterMl: number
    detail: string
    adjusted: boolean
  }
  notes: string[]
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function whoopSleepNeedHours(sleep: WhoopSleep | null): {
  hours: number
  breakdown: DailyTargets['sleep']['breakdown']
} | null {
  const need = sleep?.score?.sleep_needed
  if (!need) return null
  const baseline = milliToHours(need.baseline_milli)
  const debt = milliToHours(need.need_from_sleep_debt_milli)
  const strainNeed = milliToHours(need.need_from_recent_strain_milli)
  const nap = milliToHours(need.need_from_recent_nap_milli)
  // Whoop nap credit is typically a reduction; keep sign from API (often negative or small)
  const total = baseline + debt + strainNeed + nap
  if (total <= 0) return null
  return {
    hours: round1(clamp(total, 5.5, 11)),
    breakdown: {
      baseline: round1(baseline),
      debt: round1(debt),
      strain: round1(strainNeed),
      nap: round1(nap),
    },
  }
}

function bedtimeHint(hours: number): string {
  const wake = new Date()
  wake.setDate(wake.getDate() + 1)
  wake.setHours(6, 30, 0, 0)
  const bed = new Date(wake.getTime() - hours * 3_600_000)
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `In bed by ${fmt(bed)} for ~${fmt(wake)} wake`
}

function tomorrowIntensity(
  zone: ReturnType<typeof recoveryZone>,
  plan: PlanDay,
  phase: ReturnType<typeof racePhase>,
  todayStrain: number | null,
): { intensity: CoachIntensity; minutes: number; strainTarget: number; focus: string; adjusted: boolean; detail: string } {
  const baseMin = plan.targetMinutes ?? 0
  const rest = isRestDay(plan)

  if (phase === 'race') {
    return {
      intensity: 'race',
      minutes: 90,
      strainTarget: 14,
      focus: 'Race day — warm-up + HYROX',
      adjusted: false,
      detail: 'Race execution. Warm up well; don’t invent extra volume.',
    }
  }

  if (rest) {
    const easyWalk = zone === 'green' && phase !== 'taper'
    return {
      intensity: easyWalk ? 'easy' : 'rest',
      minutes: easyWalk ? 30 : 0,
      strainTarget: easyWalk ? 4 : 2,
      focus: easyWalk ? 'Optional easy walk + mobility' : 'Full rest / recovery',
      adjusted: false,
      detail: easyWalk
        ? 'Plan is rest — keep any movement flush, not training.'
        : 'Zero structured workout. Walk only if it helps you unwind.',
    }
  }

  // High strain today → protect tomorrow
  if (todayStrain != null && todayStrain >= 16 && zone !== 'green') {
    const mins = Math.round(baseMin * 0.45)
    return {
      intensity: 'easy',
      minutes: mins,
      strainTarget: 6,
      focus: `Recovery trim · ${plan.focus}`,
      adjusted: true,
      detail: `Today’s strain ${todayStrain.toFixed(1)} was high — cut tomorrow to ~${mins} min easy.`,
    }
  }

  if (zone === 'red' || phase === 'taper' && zone !== 'green') {
    if (zone === 'red') {
      const mins = isSimDay(plan) ? 35 : Math.max(20, Math.round(baseMin * 0.4))
      return {
        intensity: 'easy',
        minutes: mins,
        strainTarget: 5,
        focus: isSimDay(plan) ? 'Technique only — postpone full sim' : `Easy deload · ${plan.focus}`,
        adjusted: true,
        detail: `Recovery red — cap tomorrow at ~${mins} min and strain ≤ 5.`,
      }
    }
    // taper yellow/none
    const mins = Math.round(baseMin * (isSimDay(plan) ? 0.5 : 0.65))
    return {
      intensity: 'moderate',
      minutes: mins,
      strainTarget: isSimDay(plan) ? 8 : 9,
      focus: isSimDay(plan) ? 'Half HYROX / stations' : plan.focus,
      adjusted: true,
      detail: `Taper day — ~${mins} min, keep strain near ${isSimDay(plan) ? 8 : 9}.`,
    }
  }

  if (zone === 'yellow') {
    const mins = Math.round(baseMin * (isSimDay(plan) ? 0.65 : 0.8))
    return {
      intensity: 'moderate',
      minutes: mins,
      strainTarget: isSimDay(plan) ? 10 : 11,
      focus: isSimDay(plan) ? 'Controlled half / three-quarter sim' : plan.focus,
      adjusted: true,
      detail: `Yellow recovery — do the session at ~${mins} min, strain target ~${isSimDay(plan) ? 10 : 11}.`,
    }
  }

  // green / unknown with plan
  if (phase === 'taper') {
    const mins = Math.round(baseMin * (isSimDay(plan) ? 0.55 : 0.7))
    const strainTarget = isSimDay(plan) ? 9 : 10
    return {
      intensity: 'moderate',
      minutes: mins,
      strainTarget,
      focus: isSimDay(plan) ? 'Short HYROX primer' : plan.focus,
      adjusted: true,
      detail: `Green taper — sharp not long. ~${mins} min, strain ~${strainTarget}.`,
    }
  }

  const strainTarget = isSimDay(plan) ? 15 : isRunDay(plan) ? 10 : 13
  return {
    intensity: 'hard',
    minutes: baseMin,
    strainTarget,
    focus: plan.focus,
    adjusted: zone === 'none',
    detail:
      zone === 'green'
        ? `Green light — full ${baseMin} min, aim strain ~${strainTarget}.`
        : `Follow plan ${baseMin} min (sync Whoop for tighter targets). Strain aim ~${strainTarget}.`,
  }
}

function fuelForWorkout(
  state: AppState,
  workout: DailyTargets['workout'],
  zone: ReturnType<typeof recoveryZone>,
  weightGap: number | null,
): DailyTargets['fuel'] {
  const p = state.profile
  const workKcal =
    workout.minutes <= 0
      ? 0
      : Math.round(
          workout.minutes *
            (workout.intensity === 'hard' || workout.intensity === 'race'
              ? 11
              : workout.intensity === 'moderate'
                ? 8.5
                : 5),
        )

  let calories = p.calorieTarget + Math.round(workKcal * 0.55)
  let protein = p.proteinTarget
  let carbs = p.carbsTarget
  let fat = p.fatTarget
  let water = p.waterTargetMl
  let adjusted = false
  const bits: string[] = []

  if (workout.intensity === 'rest' || workout.minutes === 0) {
    calories = p.calorieTarget
    carbs = Math.max(140, Math.round(p.carbsTarget * 0.85))
    adjusted = true
    bits.push('Rest day carbs slightly lower; keep protein steady.')
  } else if (workout.intensity === 'hard' || workout.intensity === 'race') {
    calories = p.calorieTarget + Math.max(150, Math.round(workKcal * 0.65))
    protein = p.proteinTarget + 15
    carbs = p.carbsTarget + 40
    water = p.waterTargetMl + 500
    adjusted = true
    bits.push('Hard day — extra carbs + water around the session.')
  } else if (workout.intensity === 'moderate') {
    calories = p.calorieTarget + Math.round(workKcal * 0.5)
    carbs = p.carbsTarget + 15
    water = p.waterTargetMl + 250
    adjusted = true
  } else if (workout.intensity === 'easy') {
    calories = p.calorieTarget + Math.round(workKcal * 0.35)
    adjusted = workKcal > 0
  }

  // Cutting toward race weight — keep a modest deficit except on red/hard rebuild
  if (weightGap != null && weightGap > 0.8) {
    if (zone === 'red') {
      // don't slash when rebuilding
      bits.push('Above race weight, but recovery is red — eat to recover, don’t cut harder.')
    } else if (workout.intensity === 'hard' || workout.intensity === 'race') {
      calories = Math.max(p.calorieTarget, calories - 100)
      bits.push(`Still ${weightGap} kg above target — small deficit only on this hard day.`)
      adjusted = true
    } else {
      calories = Math.max(p.calorieTarget - 250, calories - 200)
      bits.push(`Fat-loss lane: ~${weightGap} kg above ${p.targetWeight} kg target.`)
      adjusted = true
    }
  }

  if (zone === 'red') {
    protein = Math.max(protein, p.proteinTarget + 20)
    carbs = Math.max(carbs, p.carbsTarget)
    adjusted = true
    bits.push('Red recovery — prioritize protein + carbs for repair.')
  }

  calories = Math.round(clamp(calories, 1600, 4200))
  protein = Math.round(clamp(protein, 120, 280))
  carbs = Math.round(clamp(carbs, 100, 450))
  fat = Math.round(clamp(fat, 45, 120))
  water = Math.round(clamp(water, 2000, 6000))

  return {
    calories,
    proteinG: protein,
    carbsG: carbs,
    fatG: fat,
    waterMl: water,
    detail: bits.join(' ') || 'Aligned to your profile targets and tomorrow’s workload.',
    adjusted,
  }
}

/** Concrete sleep / workout / fuel numbers for the next day, from Whoop + race targets. */
export function buildDailyTargets(
  state: AppState,
  cache: WhoopCache | null,
  opts?: {
    recovery?: WhoopRecovery | null
    cycle?: WhoopCycle | null
    sleep?: WhoopSleep | null
  },
): DailyTargets {
  const tomorrow = addDays(new Date(), 1)
  const forDate = todayKey(tomorrow)
  const plan = todayPlan(state, tomorrow)
  const recovery = opts?.recovery ?? cache?.recoveries?.[0] ?? null
  const cycle =
    opts?.cycle ??
    (recovery
      ? cache?.cycles.find((c) => c.id === recovery.cycle_id) ?? cache?.cycles?.[0] ?? null
      : cache?.cycles?.[0] ?? null)
  const sleep =
    opts?.sleep ??
    (recovery?.sleep_id
      ? cache?.sleeps.find((s) => s.id === recovery.sleep_id) ?? null
      : cache?.sleeps.filter((s) => !s.nap)[0] ?? null)

  const zone = recoveryZone(recovery?.score?.recovery_score ?? undefined)
  const todayStrain = cycle?.score?.strain ?? null
  const daysToRace = daysUntil(state.profile.raceDate)
  const phase = racePhase(daysToRace - 1) // phase as of tomorrow
  const weight = latestWeight(state.weightEntries)
  const weightGap =
    weight != null ? round1(weight.kg - state.profile.targetWeight) : null

  const notes: string[] = []
  const whoopNeed = whoopSleepNeedHours(sleep)
  let sleepHours: number
  let sleepSource: 'whoop' | 'profile'
  let sleepDetail: string
  let breakdown: DailyTargets['sleep']['breakdown']

  if (whoopNeed) {
    sleepHours = whoopNeed.hours
    breakdown = whoopNeed.breakdown
    sleepSource = 'whoop'
    sleepDetail = 'From Whoop sleep need (baseline + debt + strain − nap credit).'
    if (zone === 'red') {
      sleepHours = round1(clamp(sleepHours + 0.5, 6, 11))
      sleepDetail += ' +0.5h because recovery is red.'
    }
  } else {
    sleepSource = 'profile'
    sleepHours = state.profile.sleepTargetHours
    if (zone === 'red') sleepHours = round1(sleepHours + 1)
    else if (zone === 'yellow') sleepHours = round1(sleepHours + 0.5)
    if (todayStrain != null && todayStrain >= 14) sleepHours = round1(sleepHours + 0.5)
    const lastSleep = sleep ? sleepHoursFromWhoop(sleep) : null
    if (lastSleep != null && lastSleep < state.profile.sleepTargetHours - 0.7) {
      sleepHours = round1(sleepHours + (state.profile.sleepTargetHours - lastSleep) * 0.5)
    }
    sleepHours = round1(clamp(sleepHours, 6, 10.5))
    sleepDetail = cache
      ? 'Whoop sleep-need missing — estimated from recovery, strain, and your sleep target.'
      : 'Connect Whoop for sleep-need based hours. Using your profile target for now.'
  }

  if (phase === 'taper' || phase === 'race') {
    sleepHours = round1(Math.max(sleepHours, state.profile.sleepTargetHours + 0.5))
    notes.push('Taper/race window — protect sleep above all.')
  }

  const workout = tomorrowIntensity(zone, plan, phase, todayStrain)
  const fuel = fuelForWorkout(state, workout, zone, weightGap)

  if (recovery?.score?.recovery_score != null) {
    notes.push(`Based on recovery ${Math.round(recovery.score.recovery_score)}% (${zone}).`)
  }
  if (todayStrain != null) notes.push(`Today’s strain ${todayStrain.toFixed(1)} feeds tomorrow’s dose.`)
  notes.push(`${plan.weekday} plan: ${plan.focus}.`)
  notes.push(`${Math.max(0, daysToRace - 1)} days to ${state.profile.raceName} after tonight.`)

  return {
    forDate,
    forWeekday: plan.weekday,
    sleep: {
      hours: sleepHours,
      bedtimeHint: bedtimeHint(sleepHours),
      source: sleepSource,
      detail: sleepDetail,
      breakdown,
    },
    workout,
    fuel,
    notes,
  }
}
