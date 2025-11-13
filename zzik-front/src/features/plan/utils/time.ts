/**
 * Time utility functions for schedule management
 */

export const formatLocalMinute = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`
}

export const dateKeyOf = (isoLocalMinute: string): string => isoLocalMinute.slice(0, 10)

export const parseOffsetMinutes = (value: unknown): number => {
  if (typeof value !== 'string') return 0
  const match = value.match(/^(\d{1,3}):(\d{2})$/)
  if (!match) return 0
  const hours = Number(match[1]) || 0
  const minutes = Number(match[2]) || 0
  return Math.max(0, hours * 60 + minutes)
}

export const minutesToHHMM = (minutes: number): string | null => {
  if (!Number.isFinite(minutes) || minutes <= 0) return null
  const wholeMinutes = Math.round(minutes)
  const hh = String(Math.floor(wholeMinutes / 60)).padStart(2, '0')
  const mm = String(Math.max(0, wholeMinutes % 60)).padStart(2, '0')
  return `${hh}:${mm}`
}

export const millisToHHMM = (ms: number): string | null => {
  if (!Number.isFinite(ms) || ms <= 0) return null
  const minutes = Math.floor(ms / 60000)
  return minutesToHHMM(minutes)
}

/**
 * Generates a local date key in YYYY-MM-DD format
 * Uses local timezone to avoid UTC date shifting issues
 * @param d - The date to convert
 * @returns Date string in YYYY-MM-DD format
 */
export const toLocalDateKey = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Adds a specified number of days to a date
 * @param d - The base date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 */
export const addDays = (d: Date, days: number): Date => {
  const nd = new Date(d)
  nd.setDate(nd.getDate() + days)
  return nd
}

/**
 * Extracts time (HH:MM) from an ISO datetime string
 * @param isoLocal - ISO datetime string (e.g., "2024-01-15T14:30")
 * @returns Time in HH:MM format, or the original string if invalid
 */
export const toTime = (isoLocal: string): string =>
  isoLocal?.length >= 16 ? isoLocal.slice(11, 16) : isoLocal || ''

/**
 * Converts a custom input format to ISO datetime string
 * @param input - Input string in YYYY-MM-DD-HH-MM format
 * @returns ISO datetime string (YYYY-MM-DDTHH:MM) or null if invalid
 */
export const inputStartToIso = (input: string): string | null => {
  const parts = input.split('-')
  if (parts.length !== 5) return null
  const [y, mo, d, h, mi] = parts
  if (
    !/^\d{4}$/.test(y) ||
    !/^\d{2}$/.test(mo) ||
    !/^\d{2}$/.test(d) ||
    !/^\d{2}$/.test(h) ||
    !/^\d{2}$/.test(mi)
  )
    return null
  return `${y}-${mo}-${d}T${h}:${mi}`
}

/**
 * Normalizes various time offset formats to HH:MM format
 * Accepts:
 * - HH:MM format directly
 * - "X hours Y minutes" format
 * @param raw - Raw offset string
 * @returns Normalized time in HH:MM format
 */
export const normalizeOffsetToHHMM = (raw: string | null | undefined): string => {
  if (!raw) return ''
  const s = String(raw)
  const m = s.match(/^(\d{1,3}):(\d{2})$/)
  if (m) {
    const hh = String(Math.max(0, Number(m[1]) || 0)).padStart(2, '0')
    const mm = String(Math.min(59, Math.max(0, Number(m[2]) || 0))).padStart(2, '0')
    return `${hh}:${mm}`
  }
  let hours = 0
  let minutes = 0
  const hr = s.match(/(\d+)\s*hour/)
  const mn = s.match(/(\d+)\s*minute/)
  if (hr) hours = Number(hr[1]) || 0
  if (mn) minutes = Number(mn[1]) || 0
  const totalMinutes = hours * 60 + minutes
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const mm = String(totalMinutes % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * Validates if a string is in valid HH:MM format
 * @param v - String to validate
 * @returns True if string matches HH:MM format
 */
export const isValidHHMM = (v: string): boolean => /^\d{2}:\d{2}$/.test(v)
