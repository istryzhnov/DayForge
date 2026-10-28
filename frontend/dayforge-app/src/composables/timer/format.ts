import { capitalizeFirst, dateNameLocale } from '../panelDateLabel'

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

/**
 * Unit abbreviations for the duration helpers. English by default; the timer
 * UI passes the words for the interface language (see timer/text.ts).
 */
export interface DurationWords {
  hours: string
  minutes: string
  seconds: string
}

export const ENGLISH_DURATION_WORDS: DurationWords = {
  hours: 'h',
  minutes: 'm',
  seconds: 's',
}

/** "1 h 20 m" for totals, where seconds are noise. */
export function formatShortDuration(
  ms: number,
  words: DurationWords = ENGLISH_DURATION_WORDS,
): string {
  if (ms < MINUTE_MS) {
    return `${Math.max(0, Math.round(ms / SECOND_MS))} ${words.seconds}`
  }

  const hours = Math.floor(ms / HOUR_MS)
  const minutes = Math.round((ms % HOUR_MS) / MINUTE_MS)

  if (hours === 0) return `${minutes} ${words.minutes}`
  if (minutes === 0) return `${hours} ${words.hours}`
  return `${hours} ${words.hours} ${minutes} ${words.minutes}`
}

/** "12 h 30 m" for analytics hours. Under a minute reads "0 m"; minutes round to whole. */
export function formatHoursMinutes(
  ms: number,
  words: DurationWords = ENGLISH_DURATION_WORDS,
): string {
  if (ms < MINUTE_MS) return `0 ${words.minutes}`

  const totalMinutes = Math.round(ms / MINUTE_MS)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes} ${words.minutes}`
  if (minutes === 0) return `${hours} ${words.hours}`
  return `${hours} ${words.hours} ${minutes} ${words.minutes}`
}

/** A history row's duration: "<1 m" under a minute, otherwise the hours-and-minutes total. */
export function formatEntryDuration(
  ms: number,
  words: DurationWords = ENGLISH_DURATION_WORDS,
): string {
  // "45s" next to minute totals reads oddly in a log; "<1 m" says the same thing.
  if (ms > 0 && ms < MINUTE_MS) return `<1 ${words.minutes}`
  return formatHoursMinutes(ms, words)
}

/** "Sunday, 25 October", with names in the language the user picked. */
export function formatDayHeading(
  date: Date,
  locale: string = dateNameLocale(),
): string {
  const parts = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return capitalizeFirst(`${pick('weekday')}, ${pick('day')} ${pick('month')}`)
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
