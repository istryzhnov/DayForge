import { describe, expect, it } from 'vitest'
import {
  normalizeBoardColumns,
  removedColumnIds,
} from '../../src/shared/composables/goalSpace/boardColumns'
import {
  boardColumnsFor,
  buildBoardCards,
  planBoardMove,
  stageOf,
} from '../../src/features/board/composables/boardModel'
import type { DailyTask, TaskTemplate } from '../../src/entities/TaskEntity'

const TODAY = '2026-11-23'

function template(id: string, boardStage?: string): TaskTemplate {
  return {
    id,
    title: id,
    goalId: 'work',
    priority: 'minor',
    isActive: true,
    createdAt: `${TODAY}T08:00:00.000Z`,
    updatedAt: `${TODAY}T08:00:00.000Z`,
    ...(boardStage ? { boardStage } : {}),
  } as TaskTemplate
}

function row(templateId: string): DailyTask {
  return {
    id: `${templateId}::${TODAY}`,
    templateId,
    date: TODAY,
    title: templateId,
    goalId: 'work',
    priority: 'minor',
    status: 'todo',
  } as DailyTask
}

describe('normalizeBoardColumns', () => {
  it('trims names and drops nameless and repeated columns', () => {
    expect(
      normalizeBoardColumns([
        { id: 'a', title: '  Review ' },
        { id: 'b', title: '' },
        { id: 'a', title: 'Again' },
      ]),
    ).toEqual([{ id: 'a', title: 'Review' }])
  })

  it('keeps at most four', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, title: id }))
    expect(normalizeBoardColumns(many)).toHaveLength(4)
  })

  it('lists the ids that were removed', () => {
    expect(
      removedColumnIds(
        [
          { id: 'a', title: 'A' },
          { id: 'b', title: 'B' },
        ],
        [{ id: 'b', title: 'B' }],
      ),
    ).toEqual(['a'])
  })
})

describe('a board with its own columns', () => {
  it("orders To do, In progress, the project's own, then Done", () => {
    expect(
      boardColumnsFor([{ id: 'review', title: 'Review' }]).map((c) => c.key),
    ).toEqual(['todo', 'doing', 'review', 'done'])
  })

  it('puts a card in its own column, and an unknown stage in To do', () => {
    const templates = [template('a', 'review'), template('b', 'gone')]
    const cards = buildBoardCards([row('a'), row('b')], templates, TODAY, [
      'review',
    ])
    expect(cards.review.map((card) => card.id)).toEqual(['a'])
    expect(cards.todo.map((card) => card.id)).toEqual(['b'])
    expect(stageOf(templates[1], ['review'])).toBe('todo')
  })

  it('moves a card into a custom column by storing its id as the stage', () => {
    const cards = buildBoardCards([row('a')], [template('a')], TODAY, [
      'review',
    ])
    expect(planBoardMove(cards.todo[0], 'review')).toEqual({
      toggleDone: false,
      stage: 'review',
    })
    expect(planBoardMove(cards.todo[0], 'todo')).toEqual({
      toggleDone: false,
      stage: null,
    })
  })
})
