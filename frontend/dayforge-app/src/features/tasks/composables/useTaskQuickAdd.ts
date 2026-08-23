import { ref, useTemplateRef } from 'vue'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type TaskScheduleFields from '../components/TaskScheduleFields.vue'

/**
 * The one-field composer shown when a goal has nothing in it yet.
 *
 * It carries the same schedule block as every other composer — the block is
 * collapsed by default, so the empty state still reads as "type a title and
 * press Enter" while a first task can go straight onto the calendar.
 */

type QuickAddActions = {
  onSubmit: (title: string, schedule?: TaskSchedule) => void
}

export function useTaskQuickAdd(actions: QuickAddActions) {
  const title = ref('')
  // Bound by name to `ref="scheduleFields"` in the template.
  const scheduleFields =
    useTemplateRef<InstanceType<typeof TaskScheduleFields>>('scheduleFields')

  function submit() {
    const trimmed = title.value.trim()
    if (!trimmed) return
    // A half-filled schedule blocks the whole submit rather than silently
    // dropping the times the user just typed.
    if (scheduleFields.value && !scheduleFields.value.isValid) return

    actions.onSubmit(trimmed, scheduleFields.value?.buildSchedule())
    title.value = ''
    scheduleFields.value?.reset()
  }

  return { title, submit }
}
