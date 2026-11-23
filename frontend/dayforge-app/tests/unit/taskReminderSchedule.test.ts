import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RECURRENCE_TYPE } from '../../src/entities/constants'
import { TASKS_STORAGE_KEY } from '../../src/shared/composables/goalSpace/storage'
import { migrateDailyTasks } from '../../src/shared/composables/goalSpace/dailyTasks'
import {
  closeWorld,
  makeGoal,
  openWorkspace,
  resetWorld,
  TODAY,
} from './goalSpaceHarness'

beforeEach(resetWorld)
afterEach(closeWorld)

const schedule = (reminderMinutes?: number | null) => ({
  date: TODAY,
  startTime: '09:00',
  endTime: '10:00',
  ...(reminderMinutes === undefined ? {} : { reminderMinutes }),
  recurrence: { type: RECURRENCE_TYPE.NONE, startDate: TODAY },
})

describe('a per-task reminder on the task and its day row', () => {
  it('is set when the task is added, and copied to the day row', async () => {
    const { space, rowOf } = await openWorkspace()
    space.createGoal(makeGoal('work'))

    const task = space.addTask('work', 'Call', 'minor', schedule(30))!

    expect(task.reminderMinutes).toBe(30)
    expect(rowOf(task.id)?.reminderMinutes).toBe(30)
  })

  it('is changed from the schedule editor, and can be turned off', async () => {
    const { space, templateOf, rowOf } = await openWorkspace()
    space.createGoal(makeGoal('work'))
    const task = space.addTask('work', 'Call', 'minor', schedule(30))!

    space.updateTaskSchedule(task.id, schedule(null))

    expect(templateOf(task.id)?.reminderMinutes).toBeNull()
    expect(rowOf(task.id)?.reminderMinutes).toBeNull()
  })

  it('leaves the field out when the task follows the global lead', async () => {
    const { space, templateOf } = await openWorkspace()
    space.createGoal(makeGoal('work'))

    const task = space.addTask('work', 'Call', 'minor', schedule())!

    expect(templateOf(task.id)?.reminderMinutes).toBeUndefined()
  })
})

describe('old data without the field', () => {
  it('loads unchanged and gains no reminder key', async () => {
    const old = {
      id: 'old-1',
      title: 'Old task',
      priority: 'minor',
      order: 0,
      tagIds: [],
      startTime: '09:00',
      endTime: '10:00',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([old]))

    const { templateOf } = await openWorkspace()

    expect(templateOf('old-1')).toEqual(old)
    expect('reminderMinutes' in templateOf('old-1')!).toBe(false)
  })

  it('keeps a stored null and number through the day-row migration', () => {
    const rows = migrateDailyTasks([
      {
        id: 'a::2026-09-02',
        templateId: 'a',
        date: '2026-09-02',
        title: 'A',
        priority: 'minor',
        tagIds: [],
        status: 'todo',
        startTime: '09:00',
        reminderMinutes: null,
      },
      {
        id: 'b::2026-09-02',
        templateId: 'b',
        date: '2026-09-02',
        title: 'B',
        priority: 'minor',
        tagIds: [],
        status: 'todo',
        reminderMinutes: 15,
      },
      {
        id: 'c::2026-09-02',
        templateId: 'c',
        date: '2026-09-02',
        title: 'C',
        priority: 'minor',
        tagIds: [],
        status: 'todo',
      },
    ])

    const byTemplate = Object.fromEntries(
      rows.map((row) => [row.templateId, row]),
    )
    expect(byTemplate.a.reminderMinutes).toBeNull()
    expect(byTemplate.b.reminderMinutes).toBe(15)
    expect('reminderMinutes' in byTemplate.c).toBe(false)
  })
})
