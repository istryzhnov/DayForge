import { computed } from 'vue'
import type { MajorTaskOption } from '../../../entities/TaskEntity'

export type TaskPickerGroup = {
  label: string
  tasks: MajorTaskOption[]
}

/** Tasks arranged by the project they belong to, for a grouped dropdown. */
export function useTaskPicker(getOptions: () => MajorTaskOption[]) {
  const groups = computed<TaskPickerGroup[]>(() => {
    const byGoal = new Map<string, MajorTaskOption[]>()

    getOptions().forEach((option) => {
      const tasks = byGoal.get(option.goalTitle) ?? []
      tasks.push(option)
      byGoal.set(option.goalTitle, tasks)
    })

    return [...byGoal]
      .map(([label, tasks]) => ({
        label,
        tasks: [...tasks].sort((a, b) => a.title.localeCompare(b.title)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  })

  return { groups }
}
