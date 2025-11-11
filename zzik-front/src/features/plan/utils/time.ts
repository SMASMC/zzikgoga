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
