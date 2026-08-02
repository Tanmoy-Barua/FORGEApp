import type { SleepEntry, SleepQuality, StepsEntry, WeightEntry, WearableSource } from '../types'
import { uid } from '../utils/dates'

export type AppleHealthImport = {
  sleep: SleepEntry[]
  steps: StepsEntry[]
  weight: WeightEntry[]
  counts: { sleep: number; steps: number; weight: number }
}

function dateKey(iso: string): string {
  // HealthKit timestamps look like 2026-08-01 22:30:00 -0700
  const normalized = iso.replace(' ', 'T').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2')
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10)
  }
  // Use local calendar day for the end of the sample
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function hoursBetween(start: string, end: string): number {
  const a = Date.parse(start.replace(' ', 'T').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2'))
  const b = Date.parse(end.replace(' ', 'T').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2'))
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0
  return (b - a) / 3_600_000
}

function qualityFromHours(hours: number): SleepQuality {
  if (hours >= 8) return 'great'
  if (hours >= 7) return 'good'
  if (hours >= 5.5) return 'ok'
  return 'poor'
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`))
  return m?.[1] ?? null
}

/** Parse Apple Health export.xml (or a chunk of it). Large files: prefer streaming caller. */
export function parseAppleHealthExport(xml: string): AppleHealthImport {
  const source: WearableSource = 'apple_health'
  const sleepByDate = new Map<string, number>()
  const stepsByDate = new Map<string, number>()
  const weightByDate = new Map<string, number>()

  // Match Record tags without loading a full DOM (export.xml can be huge)
  const recordRe = /<Record\b[^>]*>/g
  let match: RegExpExecArray | null
  while ((match = recordRe.exec(xml))) {
    const tag = match[0]
    const type = attr(tag, 'type')
    if (!type) continue

    if (type === 'HKCategoryTypeIdentifierSleepAnalysis') {
      const start = attr(tag, 'startDate')
      const end = attr(tag, 'endDate')
      const value = attr(tag, 'value') ?? ''
      if (!start || !end) continue
      // Count asleep stages; ignore InBed / Awake
      const asleep =
        value.includes('Asleep') ||
        value.endsWith('AsleepCore') ||
        value.endsWith('AsleepDeep') ||
        value.endsWith('AsleepREM') ||
        value.endsWith('AsleepUnspecified') ||
        value === 'HKCategoryValueSleepAnalysisAsleep'
      if (!asleep && !value.includes('asleep')) continue
      const hrs = hoursBetween(start, end)
      if (hrs <= 0 || hrs > 20) continue
      const key = dateKey(end)
      sleepByDate.set(key, (sleepByDate.get(key) ?? 0) + hrs)
    }

    if (type === 'HKQuantityTypeIdentifierStepCount') {
      const start = attr(tag, 'startDate')
      const value = parseFloat(attr(tag, 'value') ?? '')
      if (!start || !Number.isFinite(value)) continue
      const key = dateKey(start)
      stepsByDate.set(key, (stepsByDate.get(key) ?? 0) + value)
    }

    if (type === 'HKQuantityTypeIdentifierBodyMass') {
      const start = attr(tag, 'startDate')
      const unit = (attr(tag, 'unit') ?? 'kg').toLowerCase()
      let value = parseFloat(attr(tag, 'value') ?? '')
      if (!start || !Number.isFinite(value)) continue
      if (unit === 'lb') value = value * 0.45359237
      const key = dateKey(start)
      weightByDate.set(key, value) // latest wins as we scan chronologically-ish
    }
  }

  const sleep: SleepEntry[] = [...sleepByDate.entries()].map(([date, hours]) => ({
    id: uid('sleep'),
    date,
    hours: Math.round(hours * 10) / 10,
    quality: qualityFromHours(hours),
    source,
  }))

  const steps: StepsEntry[] = [...stepsByDate.entries()].map(([date, total]) => ({
    id: uid('steps'),
    date,
    steps: Math.round(total),
  }))

  const weight: WeightEntry[] = [...weightByDate.entries()].map(([date, kg]) => ({
    id: uid('weight'),
    date,
    kg: Math.round(kg * 10) / 10,
  }))

  return {
    sleep,
    steps,
    weight,
    counts: { sleep: sleep.length, steps: steps.length, weight: weight.length },
  }
}

export async function readAppleHealthFile(file: File): Promise<string> {
  // Support raw export.xml or zip containing export.xml (browser unzip via JSZip would be heavy —
  // instruct user to unzip, but also accept .xml directly)
  if (file.name.toLowerCase().endsWith('.zip')) {
    throw new Error('Unzip the Apple Health export first, then select export.xml')
  }
  return file.text()
}
