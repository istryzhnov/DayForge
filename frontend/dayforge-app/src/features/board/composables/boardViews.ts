import { ref } from 'vue'
import type { ID } from '../../../entities/types'
import { readJson, writeJson } from '../../../lib/storage'

/**
 * Which view each project was last left in. This is this device's own
 * preference, so it lives in local storage and never travels through sync:
 * switching views must not stamp the project as edited.
 */
export const BOARD_VIEWS_STORAGE_KEY = 'dayforge-board-views'

export const PROJECT_VIEW = {
  LIST: 'list',
  BOARD: 'board',
} as const

export type ProjectView = (typeof PROJECT_VIEW)[keyof typeof PROJECT_VIEW]

function isProjectView(value: unknown): value is ProjectView {
  return value === PROJECT_VIEW.LIST || value === PROJECT_VIEW.BOARD
}

function readViews(): Record<ID, ProjectView> {
  const stored = readJson<unknown>(BOARD_VIEWS_STORAGE_KEY, {})
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
    return {}
  }

  const views: Record<ID, ProjectView> = {}
  Object.entries(stored).forEach(([goalId, view]) => {
    if (isProjectView(view)) views[goalId] = view
  })
  return views
}

const views = ref<Record<ID, ProjectView>>(readViews())

export function useBoardViews() {
  function viewOf(goalId: ID): ProjectView {
    return views.value[goalId] ?? PROJECT_VIEW.LIST
  }

  function setView(goalId: ID, view: ProjectView) {
    if (views.value[goalId] === view) return
    views.value = { ...views.value, [goalId]: view }
    writeJson(BOARD_VIEWS_STORAGE_KEY, views.value)
  }

  return { viewOf, setView }
}
