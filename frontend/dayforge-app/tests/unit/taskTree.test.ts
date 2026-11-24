import { describe, expect, it } from 'vitest'
import type { DailyTask, TaskTemplate } from '../../src/entities/TaskEntity'
import { useTaskTree } from '../../src/shared/composables/useTaskTree'

const DATE = '2026-09-02'

function template(id: string, priority: 'major' | 'minor', order: number) {
  return {
    id,
    title: id,
    priority,
    order,
    tagIds: [],
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  } as unknown as TaskTemplate
}

function row(
  templateItem: TaskTemplate,
  parentDailyTaskId?: string,
): DailyTask {
  return {
    id: `${templateItem.id}::${DATE}`,
    date: DATE,
    templateId: templateItem.id,
    title: templateItem.title,
    priority: templateItem.priority,
    parentDailyTaskId,
    tagIds: [],
    status: 'todo',
    createdAt: templateItem.createdAt,
  } as DailyTask
}

function treeOf(templates: TaskTemplate[], rows: DailyTask[]) {
  return useTaskTree({
    goal: null,
    goals: [],
    tasks: rows,
    currentDate: DATE,
    dailyTasks: rows,
    templates,
    newTemplateId: null,
    isAllMode: true,
  }).taskGroups.value
}

describe('task tree', () => {
  it('nests under a minor task that has subtasks', () => {
    const parent = template('parent', 'minor', 2)
    const child = template('child', 'minor', 1)
    const groups = treeOf(
      [parent, child],
      [row(parent), row(child, `parent::${DATE}`)],
    )

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      kind: 'project',
      project: { task: { templateId: 'parent' } },
      children: [{ task: { templateId: 'child' }, projectTitle: 'parent' }],
      totalCount: 1,
    })
  })

  it('draws a task with no children as a plain row, whatever its priority', () => {
    const important = template('important', 'major', 2)
    const plain = template('plain', 'minor', 1)
    const groups = treeOf([important, plain], [row(important), row(plain)])

    expect(groups.map((group) => group.kind)).toEqual(['task', 'task'])
  })

  it('keeps the drawn order among top-level tasks, ignoring priority', () => {
    const important = template('important', 'major', 1)
    const plain = template('plain', 'minor', 2)
    const groups = treeOf([important, plain], [row(important), row(plain)])

    expect(
      groups.map((group) =>
        group.kind === 'task' ? group.node.task.templateId : '',
      ),
    ).toEqual(['plain', 'important'])
  })

  it('keeps a child whose parent is not in the list as a plain row', () => {
    const orphan = template('orphan', 'minor', 1)
    const groups = treeOf([orphan], [row(orphan, `gone::${DATE}`)])

    expect(groups).toEqual([
      expect.objectContaining({
        kind: 'task',
        node: expect.objectContaining({ task: expect.anything() }),
      }),
    ])
  })
})
