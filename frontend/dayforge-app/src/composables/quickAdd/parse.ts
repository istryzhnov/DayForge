import type { Goal } from '../../entities/GoalEntity'
import type { ID, ISODate } from '../../entities/types'
import { addDaysToISODate } from '../goalSpace/date'

export type QuickAddGoal = Pick<Goal, 'id' | 'title'>

export type QuickAddDay = 'today' | 'tomorrow' | 'date'

export interface QuickAddResult {
  title: string
  goalId: ID | null
  goalTitle: string | null
  /** A #name that matched no project: one is made under this title. */
  newGoalTitle: string | null
  day: QuickAddDay | null
  date: ISODate | null
}

/**
 * Day words in every interface language, so a user can mix languages. A word
 * counts only as a whole token (case-insensitive), so "Morgenroutine" stays a
 * title. "morgen" is also German for "morning": a title that starts with it as
 * a separate word is read as tomorrow.
 */
const DAY_WORDS = new Map<string, QuickAddDay>([
  ['today', 'today'],
  ['сьогодні', 'today'],
  ['dziś', 'today'],
  ['dzisiaj', 'today'],
  ['heute', 'today'],
  ['hoy', 'today'],
  ['今天', 'today'],
  ['tomorrow', 'tomorrow'],
  ['завтра', 'tomorrow'],
  ['jutro', 'tomorrow'],
  ['morgen', 'tomorrow'],
  ['mañana', 'tomorrow'],
  ['manana', 'tomorrow'],
  ['明天', 'tomorrow'],
])

/**
 * Chinese has no spaces, so 今天 and 明天 are also read at the very start or
 * end of the input, next to the rest of the title: "明天买牛奶" schedules
 * tomorrow for "买牛奶". Not when the word is part of a noun phrase: a rest
 * that starts with 的 (after the start) or ends with 的 (before the end) is
 * left alone, so "明天的计划" stays the title "明天的计划".
 */
const CHINESE_DAY_WORDS = ['今天', '明天']

/** Splits a leading or trailing Chinese day word off a token, if it is one. */
function splitChineseDayWord(word: string): string[] {
  for (const dayWord of CHINESE_DAY_WORDS) {
    if (word.length > dayWord.length && word.startsWith(dayWord)) {
      const rest = word.slice(dayWord.length)
      if (!rest.startsWith('的')) return [dayWord, rest]
    }
    if (word.length > dayWord.length && word.endsWith(dayWord)) {
      const rest = word.slice(0, -dayWord.length)
      if (!rest.endsWith('的')) return [rest, dayWord]
    }
  }
  return [word]
}

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * A written date: 25.10.2026, 25/10/2026, 25-10-2026, 2026-10-25, or 25.10
 * without a year, which means the next 25 October from today.
 */
export function readDate(word: string, today: ISODate): ISODate | null {
  let day: number
  let month: number
  let year: number | null

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(word)
  const dotted = /^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2}|\d{4}))?$/.exec(word)
  if (iso) {
    year = Number(iso[1])
    month = Number(iso[2])
    day = Number(iso[3])
  } else if (dotted) {
    day = Number(dotted[1])
    month = Number(dotted[2])
    year = dotted[3]
      ? Number(dotted[3].length === 2 ? `20${dotted[3]}` : dotted[3])
      : null
  } else {
    return null
  }

  const thisYear = Number(today.slice(0, 4))
  const valid = (y: number) => {
    const probe = new Date(y, month - 1, day)
    return (
      probe.getFullYear() === y &&
      probe.getMonth() === month - 1 &&
      probe.getDate() === day
    )
  }
  const asISO = (y: number) => `${y}-${pad(month)}-${pad(day)}` as ISODate

  if (year !== null) return valid(year) ? asISO(year) : null
  if (valid(thisYear) && asISO(thisYear) >= today) return asISO(thisYear)
  return valid(thisYear + 1) ? asISO(thisYear + 1) : null
}

function findGoal(
  goals: readonly QuickAddGoal[],
  name: string,
): QuickAddGoal | undefined {
  const needle = name.toLowerCase()
  if (!needle) return undefined
  return (
    goals.find((goal) => goal.title.toLowerCase() === needle) ??
    goals.find((goal) => goal.title.toLowerCase().startsWith(needle))
  )
}

/** The longest run of words after a # that is a project's whole name. */
function findGoalByWords(
  goals: readonly QuickAddGoal[],
  words: readonly string[],
): { goal: QuickAddGoal; length: number } | undefined {
  for (let length = words.length; length > 1; length -= 1) {
    const name = words.slice(0, length).join(' ').toLowerCase()
    const goal = goals.find((item) => item.title.toLowerCase() === name)
    if (goal) return { goal, length }
  }
  return undefined
}

export function parseQuickAdd(
  input: string,
  options: { goals: readonly QuickAddGoal[]; today: ISODate },
): QuickAddResult {
  const kept: string[] = []
  let goal: QuickAddGoal | undefined
  let newGoalTitle: string | null = null
  let day: QuickAddDay | null = null
  let writtenDate: ISODate | null = null

  const words = input
    .split(/\s+/)
    .filter((word) => word !== '')
    .flatMap((word, index, all) =>
      index === 0 || index === all.length - 1
        ? splitChineseDayWord(word)
        : [word],
    )

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]

    if (word.startsWith('#') && word.length > 1 && !goal && !newGoalTitle) {
      const name = word.slice(1)
      const multi = findGoalByWords(options.goals, [
        name,
        ...words.slice(index + 1),
      ])
      if (multi) {
        goal = multi.goal
        index += multi.length - 1
        continue
      }
      const match = findGoal(options.goals, name)
      if (match) {
        goal = match
        continue
      }
      newGoalTitle = name.replace(/_/g, ' ')
      continue
    }

    const dayWord = DAY_WORDS.get(word.toLowerCase())
    if (dayWord) {
      if (!day) day = dayWord
      continue
    }

    const written = day ? null : readDate(word, options.today)
    if (written) {
      day = 'date'
      writtenDate = written
      continue
    }

    kept.push(word)
  }

  const date: ISODate | null =
    day === 'today'
      ? options.today
      : day === 'tomorrow'
        ? addDaysToISODate(options.today, 1)
        : writtenDate

  return {
    title: kept.join(' '),
    goalId: goal?.id ?? null,
    goalTitle: goal?.title ?? null,
    newGoalTitle,
    day,
    date,
  }
}
