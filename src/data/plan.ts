import type { PlanDay } from '../types'

export const DEFAULT_WEEKLY_PLAN: PlanDay[] = [
  {
    weekday: 'Mon',
    focus: 'Strength + HYROX conditioning',
    targetMinutes: 90,
    blocks: [
      { name: 'Warm-up', exercises: ['5 min easy row', 'Dynamic stretches', 'Activation drills'] },
      { name: 'Strength', exercises: ['Goblet Squat', 'Romanian Deadlift', 'DB Bench Press', 'Seated Row'] },
      { name: 'Conditioning', exercises: ['SkiErg intervals', 'Sled Push', 'Farmer Carry'] },
      { name: 'Core', exercises: ['Plank', 'Dead Bug', 'Hanging Knee Raise'] },
      { name: 'Cool-down', exercises: ['Walk 5 min', 'Hip flexor stretch', 'Breathing'] },
    ],
  },
  {
    weekday: 'Tue',
    focus: 'Running only',
    targetMinutes: 45,
    blocks: [
      { name: 'Warm-up', exercises: ['Walk 5 min', 'Leg swings', 'Drills'] },
      { name: 'Run', exercises: ['Run/walk intervals — build aerobic base', 'Easy conversational pace'] },
      { name: 'Cool-down', exercises: ['Walk 5 min', 'Calf stretch'] },
    ],
  },
  {
    weekday: 'Wed',
    focus: 'Strength + HYROX conditioning',
    targetMinutes: 90,
    blocks: [
      { name: 'Warm-up', exercises: ['Bike 5 min', 'Band pull-aparts', 'Hip openers'] },
      { name: 'Strength', exercises: ['Bulgarian Split Squat', 'Lat Pulldown', 'Overhead Press', 'Hip Thrust'] },
      { name: 'Conditioning', exercises: ['Rowing intervals', 'Sled Pull', 'Wall Balls'] },
      { name: 'Core', exercises: ['Plank', 'Dead Bug'] },
      { name: 'Cool-down', exercises: ['Walk 5 min', 'Thoracic mobility'] },
    ],
  },
  {
    weekday: 'Thu',
    focus: 'Running only',
    targetMinutes: 45,
    blocks: [
      { name: 'Warm-up', exercises: ['Walk 5 min', 'Ankle mobility'] },
      { name: 'Run', exercises: ['Steady aerobic run or run/walk', 'Focus on cadence'] },
      { name: 'Cool-down', exercises: ['Walk 5 min', 'Hamstring stretch'] },
    ],
  },
  {
    weekday: 'Fri',
    focus: 'Strength + conditioning',
    targetMinutes: 80,
    blocks: [
      { name: 'Warm-up', exercises: ['Jump rope / skip 3 min', 'Activation'] },
      { name: 'Strength', exercises: ['Leg Press', 'Walking Lunges', 'Pull-ups', 'Cable Fly'] },
      { name: 'Conditioning', exercises: ['Burpee Broad Jumps', 'Sandbag Lunges', 'Kettlebell Swing'] },
      { name: 'Core', exercises: ['Hanging Knee Raise', 'Plank'] },
      { name: 'Cool-down', exercises: ['Walk 5 min', 'Full-body stretch'] },
    ],
  },
  {
    weekday: 'Sat',
    focus: 'HYROX simulation',
    targetMinutes: 105,
    blocks: [
      { name: 'Warm-up', exercises: ['Easy jog 8 min', 'Station practice drills'] },
      {
        name: 'Simulation',
        exercises: [
          'Full or half race: Run → Station × 8',
          'Log every split',
          'Focus on transitions',
        ],
      },
      { name: 'Cool-down', exercises: ['Walk 10 min', 'Foam roll', 'Hydrate'] },
    ],
  },
  {
    weekday: 'Sun',
    focus: 'Rest / walk',
    targetMinutes: null,
    blocks: [
      { name: 'Recovery', exercises: ['Optional 30-min easy walk', 'Mobility work', 'Meal prep'] },
    ],
  },
]
