import { computed } from 'vue'
import type { ISODate } from '../../../entities/types'
import { useModules } from '../../../shared/composables/useModules'
import { useTaskActions, useTaskRow } from '../../tasks'
import type { TaskNode } from '../../../shared/composables/useTaskTree'
import { rowForCard, type BoardCard } from './boardModel'

/**
 * The node the task editor, rate editor and task menu take for a card. It
 * lives here, not in boardModel, because the model is checked by the node sync
 * harness and the tree types pull in the browser-only i18n setup.
 */
export function nodeForCard(
  card: BoardCard,
  today: ISODate,
  goalRate?: number,
): TaskNode {
  return { task: rowForCard(card, today), template: card.template, goalRate }
}

/**
 * The task menu and editors a board card opens. It reuses the list's own row
 * composable, so the card menu and the list menu stay the same menu.
 */
export function useBoardCardMenu(
  card: () => BoardCard,
  today: () => ISODate,
  /** The project's rate, so the rate editor can say what the card falls back to. */
  projectRate: () => number | undefined,
) {
  const actions = useTaskActions()
  const { isOn: isModuleOn } = useModules()

  const node = computed(() => nodeForCard(card(), today(), projectRate()))
  // A card is always a top-level task, so it is never nested in a project.
  const row = useTaskRow(
    {
      get node() {
        return node.value
      },
    },
    actions,
  )

  /**
   * Finishes or reopens the card. A repeating task with no row today has
   * nothing to toggle yet, so it is ticked for its day instead, as the board's
   * "Move to" does. A card whose day is not today cannot be finished.
   */
  function toggleCheck() {
    const current = card()
    if (current.row) {
      actions.toggleDone(current.row.id)
    } else if (current.canFinish) {
      actions.togglePlanned(current.templateId, today())
    }
  }

  return {
    ...row,
    node,
    notesOn: computed(() => isModuleOn('notes')),
    toggleCheck,
  }
}
