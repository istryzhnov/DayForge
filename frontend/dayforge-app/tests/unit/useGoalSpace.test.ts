import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  closeWorld,
  makeGoal,
  on,
  openWorkspace,
  passMidnight,
  resetWorld,
  tick,
  TODAY,
  TOMORROW,
  YESTERDAY,
} from './goalSpaceHarness'

beforeEach(resetWorld)
afterEach(closeWorld)

describe('adding tasks', () => {
  it('puts a new task in its project and on the day in view', async () => {
    const { space, rowOf } = await openWorkspace()
    space.createGoal(makeGoal('work'))

    const task = space.addTask('work', 'Write report')!

    expect(task).toMatchObject({
      title: 'Write report',
      goalId: 'work',
      priority: 'minor',
      isActive: true,
    })
    expect(rowOf(task.id)).toMatchObject({
      id: `${task.id}::${TODAY}`,
      title: 'Write report',
      goalId: 'work',
      status: 'todo',
    })
  })

  it('draws the newest task first', async () => {
    const { space } = await openWorkspace()
    const first = space.addTask(undefined, 'First')!
    const second = space.addTask(undefined, 'Second')!

    expect(second.order).toBeGreaterThan(first.order)
  })

  it('files a task scheduled for another day on that day only', async () => {
    const { space, rowOf, rowsOf } = await openWorkspace()

    const task = space.addTask(
      undefined,
      'Dentist',
      'minor',
      on(TOMORROW, 'none', { startTime: '09:00', endTime: '10:00' }),
    )!

    expect(rowsOf(task.id)).toHaveLength(1)
    expect(rowOf(task.id, TOMORROW)).toMatchObject({
      startTime: '09:00',
      endTime: '10:00',
    })
    expect(space.tasksForActiveGoal.value).toHaveLength(0)
  })

  it('turns a task into a project when it gets its first subtask', async () => {
    const { space, templateOf, rowOf } = await openWorkspace()
    space.createGoal(makeGoal('work'))
    const parent = space.addTask('work', 'Launch')!

    const child = space.addSubTask(parent.id, 'Write copy')!

    expect(templateOf(parent.id)!.priority).toBe('major')
    expect(rowOf(parent.id)!.priority).toBe('major')
    expect(child).toMatchObject({ parentTemplateId: parent.id, goalId: 'work' })
    expect(rowOf(child.id)!.parentDailyTaskId).toBe(rowOf(parent.id)!.id)
  })

  it('creates nothing for a subtask of a task that does not exist', async () => {
    const { space } = await openWorkspace()

    expect(space.addSubTask('missing', 'Orphan')).toBeNull()
    expect(space.taskTemplates.value).toHaveLength(0)
    expect(space.dailyTasks.value).toHaveLength(0)
  })

  it('adds under a project or straight to a goal from All Projects', async () => {
    const { space } = await openWorkspace()
    space.createGoal(makeGoal('work'))
    const project = space.addTask('work', 'Launch')!

    const nested = space.addMinorInAllMode('Nested', undefined, project.id)!
    const loose = space.addMinorInAllMode('Loose', 'work')!

    expect(nested.parentTemplateId).toBe(project.id)
    expect(loose).toMatchObject({ goalId: 'work', parentTemplateId: undefined })
  })
})

describe('editing a task', () => {
  it('renames the task and every row of it, trimmed', async () => {
    const { space, templateOf, rowOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Old')!

    space.editTaskTitle(task.id, '  New  ')

    expect(templateOf(task.id)!.title).toBe('New')
    expect(rowOf(task.id)!.title).toBe('New')
  })

  it('ignores a blank title', async () => {
    const { space, templateOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Keep me')!

    space.editTaskTitle(task.id, '   ')

    expect(templateOf(task.id)!.title).toBe('Keep me')
  })

  it('removes the notes field when the notes are cleared', async () => {
    const { space, templateOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Task')!

    space.updateTaskNotes(task.id, 'Call first')
    expect(templateOf(task.id)!.notes).toBe('Call first')

    space.updateTaskNotes(task.id, '   ')
    expect('notes' in templateOf(task.id)!).toBe(false)
  })

  it('does not stamp the task when the notes did not change', async () => {
    const { space, templateOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Task')!
    space.updateTaskNotes(task.id, 'Same')
    const stamped = templateOf(task.id)!.updatedAt

    tick()
    space.updateTaskNotes(task.id, 'Same')

    expect(templateOf(task.id)!.updatedAt).toBe(stamped)
  })

  it('treats a zero or negative rate as "use the project rate"', async () => {
    const { space, templateOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Task')!

    space.updateTaskRate(task.id, 40)
    expect(templateOf(task.id)!.hourlyRate).toBe(40)

    space.updateTaskRate(task.id, 0)
    expect(templateOf(task.id)!.hourlyRate).toBeUndefined()
  })
})

describe('ticking a task off', () => {
  it('marks it done with a time, and clears both when unticked', async () => {
    const { space, rowOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Task')!
    const rowId = rowOf(task.id)!.id

    space.toggleTaskDone(rowId)
    expect(rowOf(task.id)).toMatchObject({ status: 'done' })
    expect(rowOf(task.id)!.completedAt).toBeDefined()
    // The tick is stamped as its own group, so another device's reschedule
    // of the same row survives a merge.
    expect(rowOf(task.id)!.fieldsAt?.status).toBeDefined()

    space.toggleTaskDone(rowId)
    expect(rowOf(task.id)).toMatchObject({ status: 'todo' })
    expect(rowOf(task.id)!.completedAt).toBeUndefined()
  })

  it('ticks a planned task on a day it has no row on yet', async () => {
    const { space, rowOf } = await openWorkspace()
    const habit = space.addTask(undefined, 'Run', 'minor', on(TODAY, 'daily'))!

    space.togglePlannedTask(habit.id, TOMORROW)

    expect(rowOf(habit.id, TOMORROW)!.status).toBe('done')
    expect(rowOf(habit.id, TODAY)!.status).toBe('todo')
  })

  it('sends a finished habit back to To do on the board', async () => {
    const { space, templateOf, rowOf } = await openWorkspace()
    const habit = space.addTask(undefined, 'Run', 'minor', on(TODAY, 'daily'))!
    space.setTaskBoardStage(habit.id, 'doing')

    space.toggleTaskDone(rowOf(habit.id)!.id)

    expect('boardStage' in templateOf(habit.id)!).toBe(false)
  })

  it('leaves a one-off task in its column, so unticking returns it there', async () => {
    const { space, templateOf, rowOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Task')!
    space.setTaskBoardStage(task.id, 'doing')

    space.toggleTaskDone(rowOf(task.id)!.id)

    expect(templateOf(task.id)!.boardStage).toBe('doing')
  })
})

describe('the board', () => {
  it('stores no stage for To do', async () => {
    const { space, templateOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Task')!

    space.setTaskBoardStage(task.id, 'doing')
    space.setTaskBoardStage(task.id, undefined)

    expect('boardStage' in templateOf(task.id)!).toBe(false)
  })

  it('clears done cards and puts them back on undo', async () => {
    const { space, templateOf, undo, hasUndo } = await openWorkspace()
    const task = space.addTask(undefined, 'Task')!

    space.clearBoardDone([task.id, 'missing'])
    expect(templateOf(task.id)!.boardClearedAt).toBeDefined()

    undo()
    expect('boardClearedAt' in templateOf(task.id)!).toBe(false)
    expect(hasUndo()).toBe(false)
  })

  it('offers no undo when there was nothing to clear', async () => {
    const { space, hasUndo } = await openWorkspace()

    space.clearBoardDone(['missing'])

    expect(hasUndo()).toBe(false)
  })
})

describe('moving a task between projects', () => {
  it('takes its subtasks and its rows from today on', async () => {
    const { space, templateOf, rowOf } = await openWorkspace()
    space.createGoal(makeGoal('work'))
    space.createGoal(makeGoal('home'))
    const project = space.addTask('work', 'Launch')!
    const child = space.addSubTask(project.id, 'Write copy')!

    space.assignTaskToGoal(project.id, 'home')

    expect(templateOf(project.id)!.goalId).toBe('home')
    expect(templateOf(child.id)!.goalId).toBe('home')
    expect(rowOf(project.id)!.goalId).toBe('home')
    expect(rowOf(child.id)!.goalId).toBe('home')
  })

  it('leaves the days already behind where they were recorded', async () => {
    const { space, rowOf } = await openWorkspace()
    space.createGoal(makeGoal('work'))
    space.createGoal(makeGoal('home'))
    const habit = space.addTask('work', 'Run', 'minor', on(YESTERDAY, 'daily'))!
    space.goToToday()

    space.assignTaskToGoal(habit.id, 'home')

    expect(rowOf(habit.id, YESTERDAY)!.goalId).toBe('work')
    expect(rowOf(habit.id, TODAY)!.goalId).toBe('home')
  })

  it('takes a subtask out of its project when it goes to another goal', async () => {
    const { space, templateOf, rowOf } = await openWorkspace()
    space.createGoal(makeGoal('work'))
    space.createGoal(makeGoal('home'))
    const project = space.addTask('work', 'Launch')!
    const child = space.addSubTask(project.id, 'Write copy')!

    space.assignTaskToGoal(child.id, 'home')

    expect(templateOf(child.id)).toMatchObject({
      goalId: 'home',
      parentTemplateId: undefined,
    })
    expect(rowOf(child.id)!.parentDailyTaskId).toBeUndefined()
    expect(templateOf(project.id)!.goalId).toBe('work')
  })

  it('attaching to a project adopts that project’s goal', async () => {
    const { space, templateOf, rowOf } = await openWorkspace()
    space.createGoal(makeGoal('work'))
    const project = space.addTask('work', 'Launch')!
    space.convertTaskToProject(project.id)
    const loose = space.addTask(undefined, 'Loose')!

    space.attachTaskToProject(loose.id, project.id)

    expect(templateOf(loose.id)).toMatchObject({
      parentTemplateId: project.id,
      goalId: 'work',
    })
    expect(rowOf(loose.id)).toMatchObject({
      goalId: 'work',
      parentDailyTaskId: rowOf(project.id)!.id,
    })
  })

  it('never nests a project inside another, or a task inside itself', async () => {
    const { space, templateOf } = await openWorkspace()
    const one = space.addTask(undefined, 'One')!
    const two = space.addTask(undefined, 'Two')!
    space.convertTaskToProject(one.id)
    space.convertTaskToProject(two.id)

    space.attachTaskToProject(one.id, two.id)
    expect(templateOf(one.id)!.parentTemplateId).toBeUndefined()

    const task = space.addTask(undefined, 'Task')!
    space.attachTaskToProject(task.id, task.id)
    expect(templateOf(task.id)!.parentTemplateId).toBeUndefined()
  })

  it('does not promote a subtask to a project', async () => {
    const { space, templateOf } = await openWorkspace()
    const project = space.addTask(undefined, 'Launch')!
    const child = space.addSubTask(project.id, 'Write copy')!

    space.convertTaskToProject(child.id)

    expect(templateOf(child.id)!.priority).toBe('minor')
  })
})

describe('ordering', () => {
  it('nudges a task one place down and stops at the bottom', async () => {
    const { space } = await openWorkspace()
    space.addTask(undefined, 'Bottom')
    const top = space.addTask(undefined, 'Top')!
    const drawn = () =>
      [...space.taskTemplates.value]
        .sort((a, b) => b.order - a.order)
        .map((item) => item.title)
    expect(drawn()).toEqual(['Top', 'Bottom'])

    space.nudgeTask(top.id, 1)
    expect(drawn()).toEqual(['Bottom', 'Top'])

    const before = JSON.stringify(space.taskTemplates.value)
    space.nudgeTask(top.id, 1)
    expect(JSON.stringify(space.taskTemplates.value)).toBe(before)
  })

  it('stamps nothing when a task is dropped where it already is', async () => {
    const { space } = await openWorkspace()
    space.addTask(undefined, 'A')
    const b = space.addTask(undefined, 'B')!
    const c = space.addTask(undefined, 'C')!
    const before = JSON.stringify(space.taskTemplates.value)

    tick()
    // C is drawn on top, right above B.
    space.reorderTask(c.id, b.id, true)

    expect(JSON.stringify(space.taskTemplates.value)).toBe(before)
  })
})

describe('scheduling', () => {
  it('gives a task a time on its row', async () => {
    const { space, rowOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Task')!
    const rowId = rowOf(task.id)!.id

    space.scheduleDailyTask(rowId, '09:00', '10:00')

    expect(rowOf(task.id)).toMatchObject({
      startTime: '09:00',
      endTime: '10:00',
    })
    expect(rowOf(task.id)!.fieldsAt?.time).toBeDefined()
  })

  it('does not stamp a row that already has that time', async () => {
    const { space, rowOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Task')!
    const rowId = rowOf(task.id)!.id
    space.scheduleDailyTask(rowId, '09:00', '10:00')
    const stamped = rowOf(task.id)!.updatedAt

    tick()
    space.scheduleDailyTask(rowId, '09:00', '10:00')

    expect(rowOf(task.id)!.updatedAt).toBe(stamped)
  })

  it('takes a time off again', async () => {
    const { space, rowOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Task')!
    const rowId = rowOf(task.id)!.id
    space.scheduleDailyTask(rowId, '09:00', '10:00')

    space.unscheduleDailyTask(rowId)

    expect(rowOf(task.id)!.startTime).toBeUndefined()
    expect(rowOf(task.id)!.endTime).toBeUndefined()
  })

  it('moves a one-off task to the day its block was dropped on', async () => {
    const { space, rowOf, rowsOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Task')!

    space.scheduleDailyTaskOn(rowOf(task.id)!.id, TOMORROW, '09:00', '10:00')

    expect(rowsOf(task.id)).toHaveLength(1)
    expect(rowOf(task.id, TOMORROW)).toMatchObject({
      id: `${task.id}::${TOMORROW}`,
      startTime: '09:00',
    })
  })

  it('refuses to move one occurrence of a habit to another day', async () => {
    const { space, rowOf } = await openWorkspace()
    const habit = space.addTask(undefined, 'Run', 'minor', on(TODAY, 'weekly'))!

    space.scheduleDailyTaskOn(rowOf(habit.id)!.id, TOMORROW, '09:00', '10:00')

    expect(rowOf(habit.id, TODAY)).toBeDefined()
    expect(rowOf(habit.id, TOMORROW)).toBeUndefined()
  })

  it('rebuilds the open rows from a new rule and keeps the finished ones', async () => {
    const { space, rowOf, templateOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Task', 'minor', on(TODAY, 'daily'))!
    space.toggleTaskDone(rowOf(task.id)!.id)
    space.goToDate(TOMORROW)
    space.goToToday()
    expect(rowOf(task.id, TOMORROW)).toBeDefined()

    space.updateTaskSchedule(task.id, null)

    expect(templateOf(task.id)!.recurrence).toBeUndefined()
    expect(rowOf(task.id, TODAY)!.status).toBe('done')
    expect(rowOf(task.id, TOMORROW)).toBeUndefined()
  })

  it('puts an existing task on the calendar with its time', async () => {
    const { space, rowOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Task')!

    space.updateTaskSchedule(
      task.id,
      on(TODAY, 'none', { startTime: '14:00', endTime: '15:00' }),
    )

    expect(rowOf(task.id)).toMatchObject({
      startTime: '14:00',
      endTime: '15:00',
    })
  })
})

describe('moving between days', () => {
  it('creates a habit’s row on the day that is opened', async () => {
    const { space, rowOf } = await openWorkspace()
    const habit = space.addTask(undefined, 'Run', 'minor', on(TODAY, 'daily'))!
    expect(rowOf(habit.id, TOMORROW)).toBeUndefined()

    space.goToNextDay()

    expect(space.currentDate.value).toBe(TOMORROW)
    expect(rowOf(habit.id, TOMORROW)).toMatchObject({ status: 'todo' })
  })

  it('does not copy an open task onto a later day', async () => {
    const { space, rowsOf } = await openWorkspace()
    const task = space.addTask(undefined, 'Someday')!

    space.goToNextDay()

    expect(rowsOf(task.id).map((row) => row.date)).toEqual([TODAY])
  })

  it('shows only the selected project’s tasks, and counts per project', async () => {
    const { space } = await openWorkspace()
    space.createGoal(makeGoal('work'))
    space.createGoal(makeGoal('home'))
    space.addTask('work', 'Report')
    space.addTask('home', 'Laundry')
    space.addTask('home', 'Dishes')

    space.selectGoal('home')
    expect(
      space.tasksForActiveGoal.value.map((row) => row.title).sort(),
    ).toEqual(['Dishes', 'Laundry'])

    space.selectGoal(null)
    expect(space.tasksForActiveGoal.value).toHaveLength(3)
    expect(space.taskCountByGoal.value).toEqual({ work: 1, home: 2 })
  })

  it('follows midnight: today’s view moves on and open work comes along', async () => {
    const workspace = await openWorkspace()
    const { space, rowOf, rowsOf } = workspace
    const open = space.addTask(undefined, 'Unfinished')!
    const habit = space.addTask(undefined, 'Run', 'minor', on(TODAY, 'daily'))!

    await passMidnight(workspace)

    expect(space.currentDate.value).toBe(TOMORROW)
    // The open task is carried, not copied.
    expect(rowsOf(open.id).map((row) => row.date)).toEqual([TOMORROW])
    // The habit keeps yesterday's miss and gets a fresh row.
    expect(rowOf(habit.id, TODAY)).toBeDefined()
    expect(rowOf(habit.id, TOMORROW)).toBeDefined()
  })

  it('leaves a day the user picked on purpose alone at midnight', async () => {
    const workspace = await openWorkspace()
    workspace.space.goToDate(YESTERDAY)

    await passMidnight(workspace)

    expect(workspace.space.currentDate.value).toBe(YESTERDAY)
  })

  it('does not carry a finished task forward', async () => {
    const workspace = await openWorkspace()
    const { space, rowOf, rowsOf } = workspace
    const task = space.addTask(undefined, 'Done yesterday')!
    space.toggleTaskDone(rowOf(task.id)!.id)

    await passMidnight(workspace)

    expect(rowsOf(task.id).map((row) => row.date)).toEqual([TODAY])
  })
})

describe('pausing a project', () => {
  it('stops its habits from appearing, and resuming brings today back', async () => {
    const { space, rowOf } = await openWorkspace()
    space.createGoal(makeGoal('work'))
    const habit = space.addTask(
      'work',
      'Stand-up',
      'minor',
      on(TODAY, 'daily'),
    )!

    space.updateGoalStatus('work', 'paused')
    space.goToNextDay()
    expect(rowOf(habit.id, TOMORROW)).toBeUndefined()

    space.updateGoalStatus('work', 'active')
    expect(rowOf(habit.id, TOMORROW)).toBeDefined()
  })
})

describe('deleting', () => {
  it('removes a project task with its subtasks, and undo restores them', async () => {
    const { space, templateOf, rowOf, undo } = await openWorkspace()
    const keep = space.addTask(undefined, 'Keep')!
    const project = space.addTask(undefined, 'Launch')!
    const child = space.addSubTask(project.id, 'Write copy')!

    space.deleteTask(project.id)

    expect(space.taskTemplates.value.map((item) => item.id)).toEqual([keep.id])
    expect(space.dailyTasks.value.map((row) => row.templateId)).toEqual([
      keep.id,
    ])

    undo()

    expect(templateOf(project.id)).toBeDefined()
    expect(templateOf(child.id)!.parentTemplateId).toBe(project.id)
    expect(rowOf(child.id)!.parentDailyTaskId).toBe(rowOf(project.id)!.id)
  })

  it('keeps the days already behind as a record', async () => {
    const { space, rowOf, rowsOf } = await openWorkspace()
    const habit = space.addTask(
      undefined,
      'Run',
      'minor',
      on(YESTERDAY, 'daily'),
    )!
    space.toggleTaskDone(rowOf(habit.id, YESTERDAY)!.id)
    space.goToToday()

    space.deleteTask(habit.id)

    expect(rowsOf(habit.id).map((row) => row.date)).toEqual([YESTERDAY])
  })

  it('removes a project with everything in it, and undo reopens it', async () => {
    const { space, undo } = await openWorkspace()
    space.createGoal(makeGoal('work'))
    space.createGoal(makeGoal('home'))
    space.addTask('work', 'Report')
    const chore = space.addTask('home', 'Laundry')!
    space.selectGoal('work')

    space.deleteGoal('work')

    expect(space.goals.value.map((goal) => goal.id)).toEqual(['home'])
    expect(space.activeGoalId.value).toBeNull()
    expect(space.taskTemplates.value.map((item) => item.id)).toEqual([chore.id])
    expect(space.dailyTasks.value.map((row) => row.goalId)).toEqual(['home'])

    undo()

    expect(space.goals.value.map((goal) => goal.id).sort()).toEqual([
      'home',
      'work',
    ])
    expect(space.activeGoalId.value).toBe('work')
    expect(space.taskTemplates.value).toHaveLength(2)
    expect(space.dailyTasks.value).toHaveLength(2)
  })
})

describe('what survives a reload', () => {
  it('reads back the projects, tasks and rows that were saved', async () => {
    const first = await openWorkspace()
    first.space.createGoal(makeGoal('work'))
    const task = first.space.addTask('work', 'Report')!
    first.space.toggleTaskDone(first.rowOf(task.id)!.id)
    await first.settle()

    const second = await openWorkspace()

    expect(second.space.goals.value.map((goal) => goal.id)).toEqual(['work'])
    expect(second.templateOf(task.id)!.title).toBe('Report')
    expect(second.rowOf(task.id)!.status).toBe('done')
  })

  it('keeps a deleted task deleted', async () => {
    const first = await openWorkspace()
    const task = first.space.addTask(undefined, 'Gone')!
    await first.settle()
    first.space.deleteTask(task.id)
    await first.settle()

    const second = await openWorkspace()

    expect(second.templateOf(task.id)).toBeUndefined()
    expect(second.rowsOf(task.id)).toHaveLength(0)
  })

  it('creates today’s rows for habits when opened on a later day', async () => {
    const first = await openWorkspace()
    const habit = first.space.addTask(
      undefined,
      'Run',
      'minor',
      on(TODAY, 'daily'),
    )!
    await first.settle()

    await passMidnight(first)
    const second = await openWorkspace()

    expect(second.space.currentDate.value).toBe(TOMORROW)
    expect(second.rowOf(habit.id, TOMORROW)).toBeDefined()
  })

  it('takes over what another tab saved', async () => {
    const mine = await openWorkspace()
    const task = mine.space.addTask(undefined, 'Mine')!
    await mine.settle()

    const renamed = mine.space.taskTemplates.value.map((item) => ({
      ...item,
      title: 'Renamed in the other tab',
    }))
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'dayforge-task-templates',
        newValue: JSON.stringify(renamed),
      }),
    )

    expect(mine.templateOf(task.id)!.title).toBe('Renamed in the other tab')
  })

  it('ignores junk another tab wrote', async () => {
    const mine = await openWorkspace()
    const task = mine.space.addTask(undefined, 'Mine')!

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'dayforge-task-templates',
        newValue: '{not json',
      }),
    )

    expect(mine.templateOf(task.id)!.title).toBe('Mine')
  })
})
