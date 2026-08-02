import type { HyroxStation } from '../types'

export const HYROX_STATIONS: HyroxStation[] = [
  'SkiErg',
  'Sled Push',
  'Sled Pull',
  'Burpee Broad Jumps',
  'Rowing',
  'Farmers Carry',
  'Sandbag Lunges',
  'Wall Balls',
]

export const HYROX_RACE_SEQUENCE: Array<{
  type: 'run' | 'station'
  name: HyroxStation | 'Run'
  index: number
  defaultMetric: 'time' | 'reps' | 'weight'
  unit: string
  hint: string
}> = [
  { type: 'run', name: 'Run', index: 0, defaultMetric: 'time', unit: 'sec', hint: '1 km' },
  { type: 'station', name: 'SkiErg', index: 1, defaultMetric: 'time', unit: 'sec', hint: '1000 m' },
  { type: 'run', name: 'Run', index: 2, defaultMetric: 'time', unit: 'sec', hint: '1 km' },
  { type: 'station', name: 'Sled Push', index: 3, defaultMetric: 'time', unit: 'sec', hint: '50 m' },
  { type: 'run', name: 'Run', index: 4, defaultMetric: 'time', unit: 'sec', hint: '1 km' },
  { type: 'station', name: 'Sled Pull', index: 5, defaultMetric: 'time', unit: 'sec', hint: '50 m' },
  { type: 'run', name: 'Run', index: 6, defaultMetric: 'time', unit: 'sec', hint: '1 km' },
  { type: 'station', name: 'Burpee Broad Jumps', index: 7, defaultMetric: 'time', unit: 'sec', hint: '80 m' },
  { type: 'run', name: 'Run', index: 8, defaultMetric: 'time', unit: 'sec', hint: '1 km' },
  { type: 'station', name: 'Rowing', index: 9, defaultMetric: 'time', unit: 'sec', hint: '1000 m' },
  { type: 'run', name: 'Run', index: 10, defaultMetric: 'time', unit: 'sec', hint: '1 km' },
  { type: 'station', name: 'Farmers Carry', index: 11, defaultMetric: 'time', unit: 'sec', hint: '200 m' },
  { type: 'run', name: 'Run', index: 12, defaultMetric: 'time', unit: 'sec', hint: '1 km' },
  { type: 'station', name: 'Sandbag Lunges', index: 13, defaultMetric: 'time', unit: 'sec', hint: '100 m' },
  { type: 'run', name: 'Run', index: 14, defaultMetric: 'time', unit: 'sec', hint: '1 km' },
  { type: 'station', name: 'Wall Balls', index: 15, defaultMetric: 'time', unit: 'sec', hint: '100 reps' },
]

/** Baseline estimates (seconds) used for readiness projection when no logs exist */
export const HYROX_BASELINE_SECONDS: Record<string, number> = {
  Run: 360,
  SkiErg: 240,
  'Sled Push': 180,
  'Sled Pull': 150,
  'Burpee Broad Jumps': 240,
  Rowing: 240,
  'Farmers Carry': 120,
  'Sandbag Lunges': 180,
  'Wall Balls': 300,
}
