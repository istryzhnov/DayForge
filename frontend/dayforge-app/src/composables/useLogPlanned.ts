import { useTimeEntries } from './useTimeEntries'
import { useUndoToast } from './useUndoToast'
import {
  blockLogState,
  planBlockEntry,
  type BlockLogState,
  type PlannedBlock,
} from './timer/plannedBlocks'

/**
 * "Log as planned": writes a time entry that matches a scheduled block exactly,
 * linked to its task and project so the usual rate rules apply.
 */
export function useLogPlanned() {
  const { entries, addManual, removeEntry } = useTimeEntries()
  const { offerUndo, offerNotice } = useUndoToast()

  function stateOf(block: PlannedBlock): BlockLogState {
    return blockLogState(block, entries.value, Date.now())
  }

  function canLog(block: PlannedBlock): boolean {
    return stateOf(block) === 'loggable'
  }

  function logBlock(block: PlannedBlock): boolean {
    const plan = planBlockEntry(block, entries.value, Date.now())
    if (!plan.ok) {
      offerNotice(plan.reason, 'OK', () => {})
      return false
    }

    const created = addManual(plan.payload)
    offerUndo(
      `Logged ${block.startTime}–${block.endTime} as planned`,
      () => removeEntry(created.id),
    )
    return true
  }

  /** Logs whichever of the blocks are still free; the rest are skipped quietly. */
  function logBlocks(blocks: PlannedBlock[]): number {
    const created: string[] = []
    for (const block of blocks) {
      const plan = planBlockEntry(block, entries.value, Date.now())
      if (!plan.ok) continue
      created.push(addManual(plan.payload).id)
    }

    if (created.length > 0) {
      offerUndo(
        `Logged ${created.length} planned ${created.length === 1 ? 'block' : 'blocks'}`,
        () => created.forEach((id) => removeEntry(id)),
      )
    }
    return created.length
  }

  return { stateOf, canLog, logBlock, logBlocks }
}
