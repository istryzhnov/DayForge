import type { DailyTask, TaskTemplate } from '../../entities/TaskEntity'
import type { ID, ISODate } from '../../entities/types'
import { TASK_KIND_BY_SCHEDULE, TASK_STATUS } from '../../entities/constants'
import {
  addDaysToISODate,
  dailyTaskId,
  getTodayISODate,
  instantToLocalISODate,
} from './date'
import { occursOn, scheduleKindOf } from './recurrence'
import { isOvernight } from './overnight'
import { useSettings } from '../useSettings'
import { DAILY_FIELD_GROUPS, type DailyFieldGroup } from '../../sync/merge'

/** A paused or archived project stops feeding today's list. */
function isOnPausedGoal(
  template: TaskTemplate,
  pausedGoalIds: ReadonlySet<ID>,
): boolean {
  return template.goalId !== undefined && pausedGoalIds.has(template.goalId)
}

/**
 * Stamps an edit. Naming the group it touched lets two devices keep a tick from
 * one and a reschedule from the other instead of one overwriting the whole row.
 */
export function touchRow(row: DailyTask, group?: DailyFieldGroup) {
  const now = new Date().toISOString()
  row.updatedAt = now
  if (group === undefined) return
  row.fieldsAt = { ...row.fieldsAt, [group]: now }
}

/** The id encodes the day, so moving a row to another day renames it. */
export function moveRowToDate(row: DailyTask, date: ISODate) {
  row.date = date
  row.id = dailyTaskId(row.templateId, date)
  touchRow(row, DAILY_FIELD_GROUPS.DATE)
}

/** Later wins; a finished day always beats an unfinished one. */
function preferredRow(left: DailyTask, right: DailyTask): DailyTask {
  if (left.status === TASK_STATUS.DONE && right.status !== TASK_STATUS.DONE) {
    return left
  }
  if (right.status === TASK_STATUS.DONE && left.status !== TASK_STATUS.DONE) {
    return right
  }
  return (right.updatedAt ?? '') > (left.updatedAt ?? '') ? right : left
}

/**
 * Rows written before ids were derived carry random ones, so two devices could
 * hold two rows for the same task and day. Renaming them to the derived id
 * makes those collapse into one, and the links between rows follow along.
 */
export function migrateDailyTasks(rows: DailyTask[]): DailyTask[] {
  const now = new Date().toISOString()
  const renamed = new Map<ID, ID>()
  const byId = new Map<ID, DailyTask>()

  rows.forEach((row) => {
    // A buried copy has no business in the live list; deletions are kept apart.
    if (row.deletedAt !== undefined) return
    const id = dailyTaskId(row.templateId, row.date)
    renamed.set(row.id, id)

    const existing = byId.get(id)
    const kept = existing ? preferredRow(existing, row) : row

    byId.set(id, {
      ...kept,
      id,
      createdAt: kept.createdAt ?? now,
      updatedAt: kept.updatedAt ?? now,
    })
  })

  return [...byId.values()].map((row) => ({
    ...row,
    parentDailyTaskId: row.parentDailyTaskId
      ? (renamed.get(row.parentDailyTaskId) ?? row.parentDailyTaskId)
      : undefined,
  }))
}

/**
 * Whether a row's completion is too recent to have been the close of the day
 * the row belongs to. A project finished on its own day was finished on that
 * day; one whose row still sits on an earlier date yet was ticked off today was
 * ticked off somewhere else, and that tick is the newer, deliberate word on it.
 * Reopening it here would stamp this device's guess over another device's fact.
 *
 * The completion is read as the local date it fell on, the same date the rest of
 * the app shows. Reading the stored UTC stamp instead would move a tick made
 * after local midnight back onto the previous day.
 */
export function completedAfterItsOwnDay(
  row: DailyTask,
  today: ISODate,
  utcOffsetMinutes?: number,
): boolean {
  if (row.status !== TASK_STATUS.DONE) return false
  const at = row.completedAt
  if (at === undefined || Number.isNaN(Date.parse(at))) return false
  return instantToLocalISODate(at, utcOffsetMinutes) >= today
}

export function carryOpenTasksForward(
  taskTemplates: TaskTemplate[],
  dailyTasks: DailyTask[],
  today: ISODate,
  pausedGoalIds: ReadonlySet<ID> = new Set<ID>(),
) {
  const openTemplateIds = new Set(
    taskTemplates
      .filter(
        (template) => scheduleKindOf(template) === TASK_KIND_BY_SCHEDULE.OPEN,
      )
      .filter((template) => !isOnPausedGoal(template, pausedGoalIds))
      .map((template) => template.id),
  )

  const rowById = new Map(dailyTasks.map((row) => [row.id, row]))
  const carried: DailyTask[] = []

  dailyTasks.forEach((row) => {
    if (!openTemplateIds.has(row.templateId)) return
    if (row.status === TASK_STATUS.DONE) return
    if (row.date >= today) return
    moveRowToDate(row, today)
    carried.push(row)
  })

  // A project ticked off while its tasks are still open isn't finished, so it
  // comes along and reopens rather than stranding them on a day that passed.
  carried.forEach((row) => {
    const parent = row.parentDailyTaskId
      ? rowById.get(row.parentDailyTaskId)
      : undefined

    if (!parent || parent.date >= today) return
    if (!openTemplateIds.has(parent.templateId)) return
    if (completedAfterItsOwnDay(parent, today)) return

    moveRowToDate(parent, today)

    // Only an actual reopening is stamped. Re-stamping a row that was already
    // open would read as an edit to sync, and a status stamp dated now is the
    // one thing that can push another device's tick aside.
    if (
      parent.status !== TASK_STATUS.DONE &&
      parent.completedAt === undefined
    ) {
      return
    }

    parent.status = TASK_STATUS.TODO
    parent.completedAt = undefined
    touchRow(parent, DAILY_FIELD_GROUPS.STATUS)
  })
}

/**
 * Keeps every row's parent link pointing at a row of its own day. Carrying
 * tasks forward and repeating projects both leave links across days behind.
 */
function reattachToParentsOfDay(
  taskTemplates: TaskTemplate[],
  dailyTasks: DailyTask[],
  date: ISODate,
) {
  const templateById = new Map(
    taskTemplates.map((template) => [template.id, template]),
  )
  const rowsOfDay = dailyTasks.filter((row) => row.date === date)
  const rowByTemplate = new Map(rowsOfDay.map((row) => [row.templateId, row]))

  rowsOfDay.forEach((row) => {
    const parentTemplateId = templateById.get(row.templateId)?.parentTemplateId
    if (!parentTemplateId) return
    row.parentDailyTaskId = rowByTemplate.get(parentTemplateId)?.id
  })
}

/**
 * A task that runs past midnight is also listed on the day after, and ticking
 * it there must tick its own start row. So the day before a snapshot always
 * has the row of any overnight task that ran on it.
 */
function ensureOvernightRowsOfPreviousDay(
  taskTemplates: TaskTemplate[],
  dailyTasks: DailyTask[],
  date: ISODate,
  pausedGoalIds: ReadonlySet<ID>,
) {
  const previousDate = addDaysToISODate(date, -1)

  taskTemplates.forEach((template) => {
    if (isOnPausedGoal(template, pausedGoalIds)) return
    if (scheduleKindOf(template) === TASK_KIND_BY_SCHEDULE.OPEN) return
    if (!isOvernight(template.startTime, template.endTime)) return
    if (!occursOn(template, previousDate)) return
    ensureDailyTaskForTemplate({
      taskTemplates,
      dailyTasks,
      template,
      date: previousDate,
    })
  })

  reattachToParentsOfDay(taskTemplates, dailyTasks, previousDate)
}

export function ensureTodaySnapshot(
  taskTemplates: TaskTemplate[],
  dailyTasks: DailyTask[],
  date: ISODate,
  pausedGoalIds: ReadonlySet<ID> = new Set<ID>(),
) {
  const today = getTodayISODate()

  if (date === today && useSettings().settings.behavior.carryForward) {
    carryOpenTasksForward(taskTemplates, dailyTasks, today, pausedGoalIds)
  }

  taskTemplates.forEach((template) => {
    if (isOnPausedGoal(template, pausedGoalIds)) return

    const kind = scheduleKindOf(template)

    if (kind === TASK_KIND_BY_SCHEDULE.OPEN) {
      if (date !== today) return
      const alreadyExists = dailyTasks.some(
        (row) => row.templateId === template.id,
      )
      if (alreadyExists) return
      ensureDailyTaskForTemplate({ taskTemplates, dailyTasks, template, date })
      return
    }

    if (!occursOn(template, date)) return
    ensureDailyTaskForTemplate({ taskTemplates, dailyTasks, template, date })
  })

  ensureOvernightRowsOfPreviousDay(
    taskTemplates,
    dailyTasks,
    date,
    pausedGoalIds,
  )
  reattachToParentsOfDay(taskTemplates, dailyTasks, date)
}

export function ensureDailyTaskForTemplate({
  taskTemplates,
  dailyTasks,
  template,
  date,
}: {
  taskTemplates: TaskTemplate[]
  dailyTasks: DailyTask[]
  template: TaskTemplate
  date: ISODate
}) {
  const existing = dailyTasks.find(
    (task) => task.templateId === template.id && task.date === date,
  )
  if (existing) return

  let parentDailyTaskId: ID | undefined

  if (template.parentTemplateId) {
    const parentDailyTask = dailyTasks.find(
      (task) =>
        task.templateId === template.parentTemplateId && task.date === date,
    )

    if (parentDailyTask) {
      parentDailyTaskId = parentDailyTask.id
    } else {
      const parentTemplate = taskTemplates.find(
        (task) => task.id === template.parentTemplateId,
      )

      if (parentTemplate) {
        ensureDailyTaskForTemplate({
          taskTemplates,
          dailyTasks,
          template: parentTemplate,
          date,
        })

        parentDailyTaskId = dailyTasks.find(
          (task) =>
            task.templateId === template.parentTemplateId && task.date === date,
        )?.id
      }
    }
  }

  const now = new Date().toISOString()

  const newTask: DailyTask = {
    id: dailyTaskId(template.id, date),
    date,
    templateId: template.id,
    title: template.title,
    status: TASK_STATUS.TODO,
    priority: template.priority,
    goalId: template.goalId,
    parentDailyTaskId,
    tagIds: [],
    completedAt: undefined,
    startTime: template.startTime,
    endTime: template.endTime,
    createdAt: now,
    updatedAt: now,
  }

  dailyTasks.push(newTask)
}
