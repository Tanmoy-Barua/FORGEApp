const WHOOP_AUTH = 'https://api.prod.whoop.com/oauth/oauth2/auth'
const WHOOP_TOKEN = 'https://api.prod.whoop.com/oauth/oauth2/token'
const WHOOP_API = 'https://api.prod.whoop.com/developer/v2'
const CREDS_KEY = 'forge_whoop_v1'
const DATA_KEY = 'forge_whoop_data_v1'
const SCOPES = [
  'read:recovery',
  'read:cycles',
  'read:sleep',
  'read:workout',
  'read:profile',
  'read:body_measurement',
  'offline',
].join(' ')

export type WhoopCredentials = {
  clientId: string
  clientSecret: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  lastSyncAt?: string
}

export type WhoopProfile = {
  user_id: number
  email?: string
  first_name?: string
  last_name?: string
}

export type WhoopSleep = {
  id: string
  start: string
  end: string
  nap?: boolean
  score_state?: string
  score?: {
    stage_summary?: {
      total_in_bed_time_milli?: number
      total_slow_wave_sleep_time_milli?: number
      total_rem_sleep_time_milli?: number
      total_light_sleep_time_milli?: number
      total_awake_time_milli?: number
      sleep_cycle_count?: number
      disturbance_count?: number
    }
    sleep_needed?: {
      baseline_milli?: number
      need_from_sleep_debt_milli?: number
      need_from_recent_strain_milli?: number
      need_from_recent_nap_milli?: number
    }
    respiratory_rate?: number
    sleep_performance_percentage?: number
    sleep_consistency_percentage?: number
    sleep_efficiency_percentage?: number
  }
}

export type WhoopRecovery = {
  cycle_id: number
  sleep_id: string
  user_id?: number
  created_at?: string
  updated_at?: string
  score_state?: string
  score?: {
    user_calibrating?: boolean
    recovery_score?: number
    resting_heart_rate?: number
    hrv_rmssd_milli?: number
    spo2_percentage?: number
    skin_temp_celsius?: number
  }
}

export type WhoopCycle = {
  id: number
  user_id?: number
  created_at?: string
  updated_at?: string
  start: string
  end: string | null
  timezone_offset?: string
  score_state?: string
  score?: {
    strain?: number
    kilojoule?: number
    average_heart_rate?: number
    max_heart_rate?: number
  }
}

export type WhoopWorkout = {
  id: string
  user_id?: number
  created_at?: string
  updated_at?: string
  start: string
  end: string
  timezone_offset?: string
  sport_name?: string
  sport_id?: number
  score_state?: string
  score?: {
    strain?: number
    average_heart_rate?: number
    max_heart_rate?: number
    kilojoule?: number
    percent_recorded?: number
    distance_meter?: number
    altitude_gain_meter?: number
    zone_durations?: {
      zone_zero_milli?: number
      zone_one_milli?: number
      zone_two_milli?: number
      zone_three_milli?: number
      zone_four_milli?: number
      zone_five_milli?: number
    }
  }
}

export type WhoopBody = {
  height_meter?: number
  weight_kilogram?: number
  max_heart_rate?: number
}

export type WhoopCache = {
  syncedAt: string
  profile: WhoopProfile | null
  body: WhoopBody | null
  sleeps: WhoopSleep[]
  recoveries: WhoopRecovery[]
  cycles: WhoopCycle[]
  workouts: WhoopWorkout[]
}

function envWhoopDefaults(): Pick<WhoopCredentials, 'clientId' | 'clientSecret'> | null {
  const clientId = import.meta.env.VITE_WHOOP_CLIENT_ID
  const clientSecret = import.meta.env.VITE_WHOOP_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export function loadWhoopCredentials(): WhoopCredentials | null {
  const fromEnv = envWhoopDefaults()
  try {
    const raw = localStorage.getItem(CREDS_KEY)
    if (!raw) return fromEnv ? { ...fromEnv } : null
    const parsed = JSON.parse(raw) as WhoopCredentials
    const clientId = parsed.clientId || fromEnv?.clientId || ''
    const clientSecret = parsed.clientSecret || fromEnv?.clientSecret || ''
    if (!clientId || !clientSecret) return null
    return { ...parsed, clientId, clientSecret }
  } catch {
    return fromEnv ? { ...fromEnv } : null
  }
}

export function saveWhoopCredentials(creds: WhoopCredentials): void {
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds))
}

export function clearWhoopCredentials(): void {
  localStorage.removeItem(CREDS_KEY)
  localStorage.removeItem(DATA_KEY)
}

export function loadWhoopCache(): WhoopCache | null {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (!raw) return null
    return JSON.parse(raw) as WhoopCache
  } catch {
    return null
  }
}

export function saveWhoopCache(cache: WhoopCache): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(cache))
}

export function whoopRedirectUri(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${base}/whoop/callback`
}

export function buildWhoopAuthUrl(clientId: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: whoopRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    state,
  })
  return `${WHOOP_AUTH}?${params.toString()}`
}

async function postToken(body: Record<string, string>): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
}> {
  try {
    const proxyRes = await fetch('/api/whoop-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (proxyRes.ok) {
      return (await proxyRes.json()) as {
        access_token: string
        refresh_token?: string
        expires_in: number
      }
    }
  } catch {
    // fall through
  }

  const form = new URLSearchParams(body)
  const res = await fetch(WHOOP_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      res.status === 0 || text.includes('Failed to fetch')
        ? 'Whoop blocked the browser request (CORS). Use the live tunnel/preview proxy or Vercel.'
        : `Whoop token error: ${text || res.status}`,
    )
  }
  return (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }
}

export async function exchangeWhoopCode(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<WhoopCredentials> {
  const data = await postToken({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: whoopRedirectUri(),
  })
  const creds: WhoopCredentials = {
    clientId,
    clientSecret,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  saveWhoopCredentials(creds)
  return creds
}

export async function refreshWhoopToken(creds: WhoopCredentials): Promise<WhoopCredentials> {
  if (!creds.refreshToken) throw new Error('No Whoop refresh token — reconnect Whoop')
  const data = await postToken({
    grant_type: 'refresh_token',
    refresh_token: creds.refreshToken,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    scope: 'offline',
  })
  const next: WhoopCredentials = {
    ...creds,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? creds.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  saveWhoopCredentials(next)
  return next
}

async function whoopFetch<T>(path: string, accessToken: string): Promise<T> {
  try {
    const proxyRes = await fetch(`/api/whoop-proxy?path=${encodeURIComponent(path)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (proxyRes.ok) return (await proxyRes.json()) as T
    if (proxyRes.status !== 404) {
      const text = await proxyRes.text()
      throw new Error(text || `Whoop proxy ${proxyRes.status}`)
    }
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Failed to fetch')) throw err
  }

  const res = await fetch(`${WHOOP_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('WHOOP_UNAUTHORIZED')
    throw new Error(`Whoop API ${res.status}`)
  }
  return (await res.json()) as T
}

async function withValidToken(creds: WhoopCredentials): Promise<WhoopCredentials> {
  if (creds.accessToken && creds.expiresAt && Date.now() < creds.expiresAt - 60_000) {
    return creds
  }
  return refreshWhoopToken(creds)
}

type Collection<T> = { records: T[]; next_token?: string }

async function fetchAll<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  const out: T[] = []
  let next: string | undefined
  do {
    const qs = new URLSearchParams({ limit: '25', ...params })
    if (next) qs.set('nextToken', next)
    const page = await whoopFetch<Collection<T>>(`${path}?${qs}`, accessToken)
    out.push(...(page.records ?? []))
    next = page.next_token
  } while (next)
  return out
}

export async function syncWhoopData(days = 30): Promise<WhoopCache> {
  let creds = loadWhoopCredentials()
  if (!creds?.accessToken && !creds?.refreshToken) {
    throw new Error('Connect Whoop first')
  }
  creds = await withValidToken(creds!)

  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  const range = {
    start: start.toISOString(),
    end: end.toISOString(),
  }

  try {
    const [sleeps, recoveries, cycles, workouts, body, profile] = await Promise.all([
      fetchAll<WhoopSleep>('/activity/sleep', creds.accessToken!, range),
      fetchAll<WhoopRecovery>('/recovery', creds.accessToken!, range),
      fetchAll<WhoopCycle>('/cycle', creds.accessToken!, range),
      fetchAll<WhoopWorkout>('/activity/workout', creds.accessToken!, range),
      whoopFetch<WhoopBody>('/user/measurement/body', creds.accessToken!).catch(() => null),
      whoopFetch<WhoopProfile>('/user/profile/basic', creds.accessToken!).catch(() => null),
    ])

    const cache: WhoopCache = {
      syncedAt: new Date().toISOString(),
      profile,
      body,
      sleeps,
      recoveries,
      cycles,
      workouts,
    }
    saveWhoopCache(cache)
    saveWhoopCredentials({ ...creds, lastSyncAt: cache.syncedAt })
    return cache
  } catch (err) {
    if (err instanceof Error && err.message === 'WHOOP_UNAUTHORIZED') {
      creds = await refreshWhoopToken(creds)
      return syncWhoopData(days)
    }
    throw err
  }
}

export function sleepHoursFromWhoop(sleep: WhoopSleep): number {
  const stages = sleep.score?.stage_summary
  if (stages) {
    const asleep =
      (stages.total_light_sleep_time_milli ?? 0) +
      (stages.total_slow_wave_sleep_time_milli ?? 0) +
      (stages.total_rem_sleep_time_milli ?? 0)
    if (asleep > 0) return Math.round((asleep / 3_600_000) * 10) / 10
  }
  const start = Date.parse(sleep.start)
  const end = Date.parse(sleep.end)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.round(((end - start) / 3_600_000) * 10) / 10
}

export function milliToHours(ms?: number): number {
  if (!ms || ms <= 0) return 0
  return Math.round((ms / 3_600_000) * 10) / 10
}

export function qualityFromPerformance(pct?: number): 'poor' | 'ok' | 'good' | 'great' {
  if (pct == null) return 'ok'
  if (pct >= 90) return 'great'
  if (pct >= 75) return 'good'
  if (pct >= 55) return 'ok'
  return 'poor'
}

export function recoveryZone(score?: number): 'green' | 'yellow' | 'red' | 'none' {
  if (score == null) return 'none'
  if (score >= 67) return 'green'
  if (score >= 34) return 'yellow'
  return 'red'
}

export function formatSport(name?: string): string {
  if (!name) return 'Workout'
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatDurationMs(ms?: number): string {
  if (!ms || ms <= 0) return '—'
  const totalMin = Math.round(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

export function kjToKcal(kj?: number): number | null {
  if (kj == null) return null
  return Math.round(kj / 4.184)
}
