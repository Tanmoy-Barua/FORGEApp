import type { AppState, PlanDay, WorkoutType } from '../types'
import type { WhoopCache, WhoopCycle, WhoopRecovery, WhoopSleep } from './whoop'
import { recoveryZone, sleepHoursFromWhoop } from './whoop'
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
