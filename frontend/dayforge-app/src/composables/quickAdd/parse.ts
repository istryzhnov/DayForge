import type { Goal } from '../../entities/GoalEntity'
import type { ID, ISODate, Priority } from '../../entities/types'
import { PRIORITY } from '../../entities/constants'
import { addDaysToISODate } from '../goalSpace/date'

export type QuickAddGoal = Pick<Goal, 'id' | 'title'>

export type QuickAddDay = 'today' | 'tomorrow'

export interface QuickAddResult {
  title: string
  goalId: ID | null
  goalTitle: string | null
  priority: Priority | null
  day: QuickAddDay | null
  date: ISODate | null
}

const DAY_WORDS = new Map<string, QuickAddDay>([
  ['today', 'today'],
  ['сьогодні', 'today'],
  ['tomorrow', 'tomorrow'],
  ['завтра', 'tomorrow'],
])

const PRIORITY_WORDS = new Set(['!', '!!'])

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

export function parseQuickAdd(
  input: string,
  options: { goals: readonly QuickAddGoal[]; today: ISODate },
): QuickAddResult {
  const kept: string[] = []
  let goal: QuickAddGoal | undefined
  let priority: Priority | null = null
  let day: QuickAddDay | null = null

  const words = input.split(/\s+/).filter((word) => word !== '')

  for (const word of words) {
    if (word.startsWith('#') && word.length > 1) {
      const match = findGoal(options.goals, word.slice(1))
      if (match) {
        if (!goal) goal = match
        continue
      }
    }

    if (PRIORITY_WORDS.has(word)) {
      priority = PRIORITY.MAJOR
      continue
    }

    const dayWord = DAY_WORDS.get(word.toLowerCase())
    if (dayWord) {
      if (!day) day = dayWord
      continue
    }

    kept.push(word)
  }

  const date: ISODate | null =
    day === 'today'
      ? options.today
      : day === 'tomorrow'
        ? addDaysToISODate(options.today, 1)
        : null

  return {
    title: kept.join(' '),
    goalId: goal?.id ?? null,
    goalTitle: goal?.title ?? null,
    priority,
    day,
    date,
  }
}
