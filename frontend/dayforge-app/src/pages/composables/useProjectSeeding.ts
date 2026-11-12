import { ref } from 'vue'
import type { useGoalSpace } from '../../composables/useGoalSpace'
import type { GoalTheme } from '../../entities/GoalEntity'
import type { ID } from '../../entities/types'
import {
  GOAL_COLOR_PRESETS,
  GOAL_STATUS,
  PRIORITY,
  RECURRENCE_TYPE,
} from '../../entities/constants'
import { addMinutesToTime } from '../../composables/goalSpace/date'
import type { StarterPlan } from '../../features/onboarding/composables/useStarterTemplate'
import {
  findTemplate,
  type WelcomeTemplateId,
} from '../../features/onboarding/composables/welcomeTemplates'
import {
  startTour,
  tourEvent,
} from '../../features/onboarding/composables/useTour'
import { i18n } from '../../i18n'

type GoalSpaceApi = ReturnType<typeof useGoalSpace>

/**
 * Creating a project, and the three ways one arrives with tasks already in it:
 * the welcome card, its templates, and the starter plan.
 */
export function useProjectSeeding(
  goalSpace: GoalSpaceApi,
  selectGoal: (goalId: ID | null) => void,
) {
  /** The first preset no project is wearing yet, so a new one stands out. */
  function unusedProjectColor(): string {
    const used = new Set(
      goalSpace.goals.value.map((goal) => goal.theme?.accent?.toLowerCase()),
    )
    return (
      GOAL_COLOR_PRESETS.find((color) => !used.has(color.toLowerCase())) ??
      GOAL_COLOR_PRESETS[0]
    )
  }

  /** The welcome card's project. It opens only when the user plans their day. */
  function createFirstProject(
    title: string,
    color: string,
    select: boolean,
    templateId: WelcomeTemplateId | null = null,
  ) {
    // The tour starts first, so the project it creates counts as its first step.
    startTour()
    const id = handleCreateGoal(title, '', color)
    if (templateId) fillFromTemplate(id, templateId)
    if (select) selectGoal(id)
  }

  /** The welcome card's template: its tasks, times, repeats and rate. */
  function fillFromTemplate(goalId: ID, templateId: WelcomeTemplateId) {
    const template = findTemplate(templateId)
    const date = goalSpace.currentDate.value
    const t = i18n.global.t

    if (template.hourlyRate) {
      goalSpace.updateGoalRate(goalId, template.hourlyRate)
    }

    // A new task lands on top of the list, so add them last first.
    const lastFirst = [...template.tasks].reverse()
    lastFirst.forEach((task) => {
      const endTime =
        task.start && task.minutes
          ? addMinutesToTime(task.start, task.minutes)
          : undefined
      goalSpace.addTask(
        goalId,
        t(task.titleKey),
        PRIORITY.MINOR,
        endTime || task.daily
          ? {
              date,
              startTime: endTime ? task.start : undefined,
              endTime,
              recurrence: {
                type: task.daily ? RECURRENCE_TYPE.DAILY : RECURRENCE_TYPE.NONE,
                startDate: date,
              },
            }
          : undefined,
      )
    })
  }

  /** Every new project is made here, so each one reaches the tour the same way. */
  function createGoalRecord(
    title: string,
    description: string,
    theme?: GoalTheme,
  ): ID {
    const now = new Date().toISOString()
    const id = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    goalSpace.createGoal({
      id,
      title,
      description,
      status: GOAL_STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
      theme,
    })
    tourEvent('project-created', { goalId: id })
    return id
  }

  function handleCreateGoal(
    title: string,
    description: string,
    color: string,
  ): ID {
    return createGoalRecord(title, description, { accent: color })
  }

  const showStarter = ref(false)

  function openStarter() {
    showStarter.value = true
  }

  function closeStarter() {
    showStarter.value = false
  }

  function applyStarterPlan(plan: StarterPlan) {
    const goalId = createGoalRecord(plan.goalTitle, plan.goalDescription)
    goalSpace.selectGoal(goalId)

    const project = goalSpace.addTask(goalId, plan.projectTitle, PRIORITY.MINOR)
    if (!project) return

    plan.tasks.forEach((task) => {
      const created = goalSpace.addSubTask(
        project.id,
        task.title,
        PRIORITY.MINOR,
      )
      if (!created) return

      const row = goalSpace.dailyTasks.value.find(
        (item) =>
          item.templateId === created.id &&
          item.date === goalSpace.currentDate.value,
      )
      if (row) {
        goalSpace.scheduleDailyTask(row.id, task.startTime, task.endTime)
      }
    })
  }

  function handleApplyStarter(plan: StarterPlan) {
    applyStarterPlan(plan)
    closeStarter()
  }

  return {
    showStarter,
    openStarter,
    closeStarter,
    handleApplyStarter,
    handleCreateGoal,
    createFirstProject,
    unusedProjectColor,
  }
}
