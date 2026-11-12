import { computed } from 'vue'
import type { useGoalSpace } from '../../composables/useGoalSpace'
import type { MajorTaskOption, TaskTemplate } from '../../entities/TaskEntity'
import { i18n } from '../../i18n'

type GoalSpaceApi = ReturnType<typeof useGoalSpace>

/** The pickers' option lists: projects to file a task under, tasks to time. */
export function useTaskOptions(goalSpace: GoalSpaceApi) {
  const goalTitleById = computed(
    () => new Map(goalSpace.goals.value.map((goal) => [goal.id, goal.title])),
  )

  /** `noProject` names a task filed nowhere, `missing` one whose project is gone. */
  function optionOf(
    template: TaskTemplate,
    noProject: string,
    missing: string,
  ): MajorTaskOption {
    return {
      id: template.id,
      title: template.title,
      goalId: template.goalId,
      goalTitle: template.goalId
        ? (goalTitleById.value.get(template.goalId) ?? missing)
        : noProject,
    }
  }

  const majorTaskOptions = computed<MajorTaskOption[]>(() =>
    goalSpace.activeMajorTemplates.value.map((template) =>
      optionOf(
        template,
        i18n.global.t('tasks.allTasks'),
        i18n.global.t('tasks.unknownGoal'),
      ),
    ),
  )

  /** Everything the timer can book time against, projects and tasks alike. */
  const timerTaskOptions = computed<MajorTaskOption[]>(() => {
    const noProject = i18n.global.t('goals.noProject')
    return goalSpace.taskTemplates.value
      .filter((template) => template.isActive)
      .map((template) => optionOf(template, noProject, noProject))
  })

  return { majorTaskOptions, timerTaskOptions }
}
