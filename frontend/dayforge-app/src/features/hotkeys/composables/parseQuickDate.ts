import type { ISODate, TimeOfDay } from '../../../entities/types'
import {
  addDaysToISODate,
  parseISODate,
} from '../../../shared/composables/goalSpace/date'

export type QuickDateDay = 'today' | 'tomorrow' | 'weekday'

export interface QuickDateParse {
  /** The input without the date and time words. */
  title: string
  /** Set when a day word, a weekday name or a time was found. */
  date: ISODate | null
  /** 24-hour HH:MM, from 9:00, 9am, 9 pm or 9点. */
  startTime: TimeOfDay | null
  /** What the date came from; null when only a time was given. */
  day: QuickDateDay | null
  /** Character ranges of the input read as date or time words, for highlighting. */
  ranges: Array<{ start: number; end: number }>
}

/**
 * Day words in the six interface languages. Accented and unaccented spellings
 * are both listed, and apostrophes match either quote character. Words match
 * as whole tokens, except Chinese, which has no spaces.
 */
const DAY_WORDS: ReadonlyArray<readonly [string, 'today' | 'tomorrow']> = [
  ['today', 'today'],
  ['tomorrow', 'tomorrow'],
  ['сьогодні', 'today'],
  ['завтра', 'tomorrow'],
  ['heute', 'today'],
  ['morgen', 'tomorrow'],
  ['dziś', 'today'],
  ['dzisiaj', 'today'],
  ['jutro', 'tomorrow'],
  ['hoy', 'today'],
  ['mañana', 'tomorrow'],
  ['manana', 'tomorrow'],
  ['今天', 'today'],
  ['明天', 'tomorrow'],
]

/** Weekday names with their JavaScript getDay() value (0 = Sunday). */
const WEEKDAY_WORDS: ReadonlyArray<readonly [string, number]> = [
  ['понеділок', 1],
  ['вівторок', 2],
  ['середа', 3],
  ['четвер', 4],
  ["п'ятниця", 5],
  ['субота', 6],
  ['неділя', 0],
  ['середу', 3],
  ["п'ятницю", 5],
  ['суботу', 6],
  ['неділю', 0],
  ['monday', 1],
  ['tuesday', 2],
  ['wednesday', 3],
  ['thursday', 4],
  ['friday', 5],
  ['saturday', 6],
  ['sunday', 0],
  ['montag', 1],
  ['dienstag', 2],
  ['mittwoch', 3],
  ['donnerstag', 4],
  ['freitag', 5],
  ['samstag', 6],
  ['sonntag', 0],
  ['poniedziałek', 1],
  ['środę', 3],
  ['wtorek', 2],
  ['środa', 3],
  ['czwartek', 4],
  ['piątek', 5],
  ['sobota', 6],
  ['niedziela', 0],
  ['lunes', 1],
  ['martes', 2],
  ['miércoles', 3],
  ['miercoles', 3],
  ['jueves', 4],
  ['viernes', 5],
  ['sábado', 6],
  ['sabado', 6],
  ['domingo', 0],
  ['星期一', 1],
  ['星期二', 2],
  ['星期三', 3],
  ['星期四', 4],
  ['星期五', 5],
  ['星期六', 6],
  ['星期日', 0],
  ['星期天', 0],
  ['周一', 1],
  ['周二', 2],
  ['周三', 3],
  ['周四', 4],
  ['周五', 5],
  ['周六', 6],
  ['周日', 0],
  ['周天', 0],
]

const CJK = /[\u3000-\u9fff]/

/** Lower case, with the typographic apostrophe folded to the plain one. */
const normalize = (word: string) => word.toLowerCase().replace(/’/g, "'")

function escapeWord(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]")
}

/** Alternatives sorted longest first, so a longer word wins over its prefix. */
function alternatives(words: readonly string[]): string {
  return [...words]
    .sort((a, b) => b.length - a.length)
    .map(escapeWord)
    .join('|')
}

const LETTER = String.raw`[\p{L}\p{N}]`

function wordPattern(words: readonly string[]): RegExp {
  const latin = words.filter((word) => !CJK.test(word))
  const cjk = words.filter((word) => CJK.test(word))
  const parts: string[] = []
  if (latin.length > 0) {
    parts.push(`(?<!${LETTER})(?:${alternatives(latin)})(?!${LETTER})`)
  }
  if (cjk.length > 0) parts.push(`(?:${alternatives(cjk)})`)
  return new RegExp(parts.join('|'), 'giu')
}

const DAY_RE = wordPattern(DAY_WORDS.map(([word]) => word))
const WEEKDAY_RE = wordPattern(WEEKDAY_WORDS.map(([word]) => word))

/**
 * A time: 9:00, 09:00, 9am, 9:30 pm, 9点, 下午3点. A preposition in front
 * (о, at, um, o, a las, a) is read as part of the time, so "о 9:00" leaves
 * no stray word behind.
 */
const TIME_RE = new RegExp(
  String.raw`(?<![\p{Ll}\p{Lu}\p{N}:./-])(?:(?:о|об|at|um|o|a\s+las|a)\s+)?` +
    String.raw`(?:(?<period>上午|下午|晚上|早上)\s*)?` +
    String.raw`(?:(?<h1>\d{1,2})(?::(?<m1>\d{2}))?\s*(?<ampm>am|pm)(?!${LETTER}|:)` +
    String.raw`|(?<h2>\d{1,2}):(?<m2>\d{2})(?!${LETTER}|:)` +
    String.raw`|(?<h3>\d{1,2})点(?:(?<m3>\d{1,2})分?)?)`,
  'giu',
)

const pad = (value: number) => String(value).padStart(2, '0')

/** The time in 24-hour HH:MM, or null when the numbers do not form a time. */
function readTime(match: RegExpMatchArray): TimeOfDay | null {
  const groups = match.groups ?? {}
  const period = groups.period
  let hour: number
  let minute = 0

  if (groups.h1 !== undefined) {
    hour = Number(groups.h1)
    minute = groups.m1 ? Number(groups.m1) : 0
    if (hour < 1 || hour > 12) return null
    const isPm = groups.ampm?.toLowerCase() === 'pm'
    if (isPm && hour < 12) hour += 12
    if (!isPm && hour === 12) hour = 0
  } else if (groups.h2 !== undefined) {
    hour = Number(groups.h2)
    minute = Number(groups.m2)
  } else if (groups.h3 !== undefined) {
    hour = Number(groups.h3)
    minute = groups.m3 ? Number(groups.m3) : 0
  } else {
    return null
  }

  if (period === '下午' || period === '晚上') {
    if (hour < 12) hour += 12
  }
  if (hour > 23 || minute > 59) return null
  return `${pad(hour)}:${pad(minute)}` as TimeOfDay
}

interface Found {
  start: number
  end: number
  value: string
}

function firstOf(input: string, pattern: RegExp): Found | null {
  for (const match of input.matchAll(
    new RegExp(pattern.source, pattern.flags),
  )) {
    return {
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      value: match[0],
    }
  }
  return null
}

/**
 * Finds a day word, a weekday name and a time in a quick-add line, in any of
 * the six languages. Returns the line without those words.
 *
 * A weekday means the next one after `today`; the same weekday as today means
 * a week from today. A time with no day word means today. Only the first day
 * word and the first time are read; later ones stay in the title.
 */
export function parseQuickDate(input: string, today: ISODate): QuickDateParse {
  const ranges: Array<{ start: number; end: number }> = []

  let date: ISODate | null = null
  let day: QuickDateDay | null = null

  const dayWord = firstOf(input, DAY_RE)
  const weekdayWord = firstOf(input, WEEKDAY_RE)
  const dayFound =
    dayWord && (!weekdayWord || dayWord.start <= weekdayWord.start)
      ? dayWord
      : weekdayWord

  if (dayFound) {
    const key = normalize(dayFound.value)
    const relative = DAY_WORDS.find(([word]) => normalize(word) === key)?.[1]
    if (relative === 'today') {
      day = 'today'
      date = today
    } else if (relative === 'tomorrow') {
      day = 'tomorrow'
      date = addDaysToISODate(today, 1)
    } else {
      const target = WEEKDAY_WORDS.find(
        ([word]) => normalize(word) === key,
      )?.[1]
      if (target !== undefined) {
        const todayWeekday = parseISODate(today).getDay()
        const ahead = (target - todayWeekday + 7) % 7 || 7
        day = 'weekday'
        date = addDaysToISODate(today, ahead)
      }
    }
    if (date) ranges.push({ start: dayFound.start, end: dayFound.end })
  }

  let startTime: TimeOfDay | null = null
  const timeMatch = [...input.matchAll(TIME_RE)].find(
    (match) => readTime(match) !== null,
  )
  if (timeMatch) {
    startTime = readTime(timeMatch)
    const start = timeMatch.index ?? 0
    ranges.push({ start, end: start + timeMatch[0].length })
    if (!date) date = today
  }

  const kept = removeRanges(input, ranges)

  return {
    title: kept,
    date,
    startTime,
    day,
    ranges: ranges.sort((a, b) => a.start - b.start),
  }
}

function removeRanges(
  input: string,
  ranges: ReadonlyArray<{ start: number; end: number }>,
): string {
  let result = ''
  let cursor = 0
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    result += input.slice(cursor, range.start) + ' '
    cursor = range.end
  }
  result += input.slice(cursor)
  return result
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,;]+|[,;]+$/g, '')
    .trim()
}
