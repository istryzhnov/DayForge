const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** `mm:ss`, widening to `h:mm:ss` once an hour is on the clock. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / SECOND_MS))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

/** "1h 20m" for totals, where seconds are noise. */
export function formatShortDuration(ms: number): string {
  if (ms < MINUTE_MS) return `${Math.max(0, Math.round(ms / SECOND_MS))}s`

  const hours = Math.floor(ms / HOUR_MS)
  const minutes = Math.round((ms % HOUR_MS) / MINUTE_MS)

  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function formatTimeLabel(
  isoDateTime: string,
  locale: string,
  uses12Hour: boolean,
): string {
  return new Date(isoDateTime).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: uses12Hour,
  })
}

/** `YYYY-MM-DDTHH:mm` in local time, the shape `datetime-local` expects. */
export function toDateTimeInput(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) return ''

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('')
}

/** Empty string for input the browser could not parse. */
export function fromDateTimeInput(value: string): string {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}
