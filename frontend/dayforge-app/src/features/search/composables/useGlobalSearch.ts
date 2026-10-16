import { computed, ref, watch } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { RecurrenceType } from '../../../entities/RecurrenceEntity'
import type { GoalStatus, ID, ISODate } from '../../../entities/types'
import { TASK_STATUS } from '../../../entities/constants'
import { projectColors } from '../../../composables/theme/goalTheme'
import {
  isRepeating,
  nextPlannedDateOf,
} from '../../../composables/goalSpace/recurrence'
import {
  foldQuery,
  foldText,
  highlightSegments,
  snippetSegments,
  type TextSegment,
} from './searchText'

/** Upper bound on rows across all groups, so the palette stays short. */
export const SEARCH_RESULT_LIMIT = 30

export type SearchGroupKey = 'projects' | 'tasks' | 'done'

export type SearchResult = {
  key: string
  kind: 'project' | 'task' | 'done'
  title: string
  titleSegments: TextSegment[]
  /** Shown instead of the title when only the notes matched. */
  snippet: TextSegment[] | null
  /** Project to open. Null means "All Projects". */
  goalId: ID | null
  /** Daily row to scroll to and flash once the project is open. */
  rowId: ID | null
  projectTitle: string | null
  color?: string
  status?: GoalStatus
  date?: ISODate
  repeat?: RecurrenceType
}

export type SearchGroup = {
  key: SearchGroupKey
  label: string
  results: SearchResult[]
}

type SearchSource = {
  goals: Goal[]
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
  today: ISODate
}

type SearchOptions = {
  getGoals: () => Goal[]
  getTemplates: () => TaskTemplate[]
  getDailyTasks: () => DailyTask[]
  getToday: () => ISODate
}

/** 3 = title starts with the query, 2 = title contains it, 1 = notes contain it, 0 = no match. */
const SCORE = { PREFIX: 3, TITLE: 2, NOTES: 1, NONE: 0 } as const

function scoreOf(
  needle: string,
  title: string,
  notes: string | undefined,
): number {
  const folded = foldText(title)
  if (folded.startsWith(needle)) return SCORE.PREFIX
  if (folded.includes(needle)) return SCORE.TITLE
  if (notes && foldText(notes).includes(needle)) return SCORE.NOTES
  return SCORE.NONE
}

function scheduleOf(
  template: TaskTemplate | undefined,
  today: ISODate,
): Pick<SearchResult, 'date' | 'repeat'> {
  if (!template?.recurrence) return {}
  return {
    date: nextPlannedDateOf(template, today) ?? undefined,
    repeat: isRepeating(template) ? template.recurrence.type : undefined,
  }
}

function buildGroups(needle: string, source: SearchSource): SearchGroup[] {
  if (!needle) return []

  const { goals, templates, dailyTasks, today } = source
  const colors = projectColors(goals)
  const goalTitleById = new Map(goals.map((goal) => [goal.id, goal.title]))
  const templateById = new Map(templates.map((item) => [item.id, item]))
  const todayRowByTemplate = new Map<ID, DailyTask>()
  dailyTasks.forEach((row) => {
    if (row.date === today && !row.deletedAt) {
      todayRowByTemplate.set(row.templateId, row)
    }
  })

  function projectTitleOf(goalId: ID | undefined): string {
    if (!goalId) return 'No project'
    return goalTitleById.get(goalId) ?? 'Unknown project'
  }

  const projects = goals
    .filter((goal) => !goal.deletedAt)
    .flatMap((goal): Array<[number, SearchResult]> => {
      const score = scoreOf(needle, goal.title, undefined)
      if (score === SCORE.NONE) return []
      return [
        [
          score,
          {
            key: `project:${goal.id}`,
            kind: 'project',
            title: goal.title,
            titleSegments: highlightSegments(goal.title, needle),
            snippet: null,
            goalId: goal.id,
            rowId: null,
            projectTitle: null,
            color: colors.get(goal.id),
            status: goal.status,
          },
        ],
      ]
    })

  const tasks = templates
    .filter((template) => !template.deletedAt && template.isActive)
    .flatMap((template): Array<[number, SearchResult]> => {
      const score = scoreOf(needle, template.title, template.notes)
      if (score === SCORE.NONE) return []
      const row = todayRowByTemplate.get(template.id)
      return [
        [
          score,
          {
            key: `task:${template.id}`,
            kind: 'task',
            title: template.title,
            titleSegments: highlightSegments(template.title, needle),
            snippet:
              score === SCORE.NOTES && template.notes
                ? snippetSegments(template.notes, needle)
                : null,
            goalId: template.goalId ?? null,
            rowId: row?.id ?? null,
            projectTitle: projectTitleOf(template.goalId),
            color: template.goalId ? colors.get(template.goalId) : undefined,
            ...scheduleOf(template, today),
          },
        ],
      ]
    })

  const done = dailyTasks
    .filter((row) => row.status === TASK_STATUS.DONE && !row.deletedAt)
    .flatMap((row): Array<[number, SearchResult]> => {
      const template = templateById.get(row.templateId)
      const score = scoreOf(needle, row.title, template?.notes)
      if (score === SCORE.NONE) return []
      const goalId = row.goalId ?? template?.goalId ?? undefined
      return [
        [
          score,
          {
            key: `done:${row.id}`,
            kind: 'done',
            title: row.title,
            titleSegments: highlightSegments(row.title, needle),
            snippet:
              score === SCORE.NOTES && template?.notes
                ? snippetSegments(template.notes, needle)
                : null,
            goalId: goalId ?? null,
            rowId: row.id,
            projectTitle: projectTitleOf(goalId),
            color: goalId ? colors.get(goalId) : undefined,
            date: row.date,
          },
        ],
      ]
    })

  // Best matches first within each group; Array.sort is stable, so ties keep
  // the order of the source list.
  const sorted = [projects, tasks, done].map((group) =>
    group.sort((a, b) => b[0] - a[0]).map(([, result]) => result),
  )

  let budget = SEARCH_RESULT_LIMIT
  const capped = sorted.map((results) => {
    const kept = results.slice(0, budget)
    budget -= kept.length
    return kept
  })

  const labels: Record<SearchGroupKey, string> = {
    projects: 'Projects',
    tasks: 'Tasks',
    done: 'Archived and done',
  }
  const keys: SearchGroupKey[] = ['projects', 'tasks', 'done']

  return keys
    .map((key, index) => ({ key, label: labels[key], results: capped[index] }))
    .filter((group) => group.results.length > 0)
}

export function useGlobalSearch(options: SearchOptions) {
  const query = ref('')
  const activeIndex = ref(0)

  const needle = computed(() => foldQuery(query.value))

  const groups = computed<SearchGroup[]>(() =>
    buildGroups(needle.value, {
      goals: options.getGoals(),
      templates: options.getTemplates(),
      dailyTasks: options.getDailyTasks(),
      today: options.getToday(),
    }),
  )

  const results = computed(() => groups.value.flatMap((group) => group.results))

  const activeResult = computed<SearchResult | null>(
    () => results.value[activeIndex.value] ?? null,
  )

  const hasQuery = computed(() => needle.value !== '')

  watch(query, () => {
    activeIndex.value = 0
  })

  function move(step: number) {
    const count = results.value.length
    if (count === 0) return
    activeIndex.value = (activeIndex.value + step + count) % count
  }

  function setActive(index: number) {
    activeIndex.value = index
  }

  return {
    query,
    groups,
    results,
    activeIndex,
    activeResult,
    hasQuery,
    move,
    setActive,
  }
}
