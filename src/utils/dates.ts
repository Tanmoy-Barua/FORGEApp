import {
  differenceInCalendarDays,
  format,
  formatDistanceStrict,
  parseISO,
  startOfWeek,
  addDays,
  isSameDay,
} from 'date-fns'
import type { Weekday } from '../types'

const WEEKDAY_MAP: Weekday[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function todayKey(date = new Date()): string {
  return format(date, 'yyyy-MM-dd')
}

export function weekdayOf(date = new Date()): Weekday {
  return WEEKDAY_MAP[date.getDay()]
}

export function formatDisplayDate(dateStr: string): string {
  return format(parseISO(dateStr), 'EEE · MMM d')
}

export function daysUntil(dateStr: string, from = new Date()): number {
  return differenceInCalendarDays(parseISO(dateStr), from)
}

export function raceProgress(programStart: string, raceDate: string, from = new Date()): number {
  const total = differenceInCalendarDays(parseISO(raceDate), parseISO(programStart))
  const elapsed = differenceInCalendarDays(from, parseISO(programStart))
  if (total <= 0) return 0
  return Math.min(1, Math.max(0, elapsed / total))
}

export function weekDates(from = new Date()): string[] {
  const start = startOfWeek(from, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => todayKey(addDays(start, i)))
}

export function formatPace(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return '—'
  const m = Math.floor(secondsPerKm / 60)
  const s = Math.round(secondsPerKm % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function relativeDays(dateStr: string): string {
  return formatDistanceStrict(parseISO(dateStr), new Date(), { addSuffix: true })
}

export function isToday(dateStr: string): boolean {
  return isSameDay(parseISO(dateStr), new Date())
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`
}
