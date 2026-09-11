import { ref, useTemplateRef } from 'vue'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type TaskScheduleFields from '../components/TaskScheduleFields.vue'

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
    if (scheduleFields.value && !scheduleFields.value.isValid) return

    actions.onSubmit(trimmed, scheduleFields.value?.buildSchedule())
    title.value = ''
    scheduleFields.value?.reset()
  }

  return { title, submit }
}
