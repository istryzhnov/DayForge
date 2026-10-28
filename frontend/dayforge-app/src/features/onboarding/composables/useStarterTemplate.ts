import { computed, ref } from 'vue'
import type { Priority, TimeOfDay } from '../../../entities/types'
import { PRIORITY } from '../../../entities/constants'
import {
  addMinutesToTime,
  getTodayISODate,
} from '../../../composables/goalSpace/date'
import { i18n } from '../../../i18n'

export type StarterFocus = 'work' | 'study' | 'health' | 'balance'
export type StarterStart = 'early' | 'standard' | 'late'
export type StarterLoad = 'light' | 'balanced' | 'full'

type BlueprintTask = {
  /** Message key of the task title: the title is user data once created. */
  titleKey: string
  /** Minutes after the day's start time. */
  offsetMinutes: number
  durationMinutes: number
}

type Blueprint = {
  goalTitleKey: string
  goalDescriptionKey: string
  projectTitleKey: string
  tasks: BlueprintTask[]
}

/** Labels are message keys, rendered with t() where the option is shown. */
export const FOCUS_OPTIONS = [
  {
    value: 'work',
    labelKey: 'onboarding.starterFocusWork',
    hintKey: 'onboarding.starterFocusWorkHint',
  },
  {
    value: 'study',
    labelKey: 'onboarding.starterFocusStudy',
    hintKey: 'onboarding.starterFocusStudyHint',
  },
  {
    value: 'health',
    labelKey: 'onboarding.starterFocusHealth',
    hintKey: 'onboarding.starterFocusHealthHint',
  },
  {
    value: 'balance',
    labelKey: 'onboarding.starterFocusBalance',
    hintKey: 'onboarding.starterFocusBalanceHint',
  },
] as const

export const START_OPTIONS = [
  {
    value: 'early',
    labelKey: 'onboarding.starterStartEarly',
    hintKey: 'onboarding.starterStartHint',
    hintValues: { time: '07:00' },
  },
  {
    value: 'standard',
    labelKey: 'onboarding.starterStartStandard',
    hintKey: 'onboarding.starterStartHint',
    hintValues: { time: '09:00' },
  },
  {
    value: 'late',
    labelKey: 'onboarding.starterStartLate',
    hintKey: 'onboarding.starterStartHint',
    hintValues: { time: '11:00' },
  },
] as const

export const LOAD_OPTIONS = [
  {
    value: 'light',
    labelKey: 'onboarding.starterLoadLight',
    hintKey: 'onboarding.starterLoadHint',
    hintValues: { count: 2 },
  },
  {
    value: 'balanced',
    labelKey: 'onboarding.starterLoadBalanced',
    hintKey: 'onboarding.starterLoadHint',
    hintValues: { count: 3 },
  },
  {
    value: 'full',
    labelKey: 'onboarding.starterLoadFull',
    hintKey: 'onboarding.starterLoadHint',
    hintValues: { count: 4 },
  },
] as const

const START_TIME: Record<StarterStart, TimeOfDay> = {
  early: '07:00',
  standard: '09:00',
  late: '11:00',
}

const BLOCK_COUNT: Record<StarterLoad, number> = {
  light: 2,
  balanced: 3,
  full: 4,
}

const BLUEPRINTS: Record<StarterFocus, Blueprint> = {
  work: {
    goalTitleKey: 'onboarding.starterWorkGoal',
    goalDescriptionKey: 'onboarding.starterWorkGoalDescription',
    projectTitleKey: 'onboarding.starterWorkProject',
    tasks: [
      {
        titleKey: 'onboarding.starterTaskDeepWork',
        offsetMinutes: 0,
        durationMinutes: 90,
      },
      {
        titleKey: 'onboarding.starterTaskClearInbox',
        offsetMinutes: 120,
        durationMinutes: 30,
      },
      {
        titleKey: 'onboarding.starterTaskPlanTomorrow',
        offsetMinutes: 300,
        durationMinutes: 30,
      },
      {
        titleKey: 'onboarding.starterTaskReviewShipped',
        offsetMinutes: 420,
        durationMinutes: 45,
      },
    ],
  },
  study: {
    goalTitleKey: 'onboarding.starterStudyGoal',
    goalDescriptionKey: 'onboarding.starterStudyGoalDescription',
    projectTitleKey: 'onboarding.starterStudyProject',
    tasks: [
      {
        titleKey: 'onboarding.starterTaskReadChapter',
        offsetMinutes: 0,
        durationMinutes: 60,
      },
      {
        titleKey: 'onboarding.starterTaskPractice',
        offsetMinutes: 90,
        durationMinutes: 60,
      },
      {
        titleKey: 'onboarding.starterTaskReviewNotes',
        offsetMinutes: 240,
        durationMinutes: 30,
      },
      {
        titleKey: 'onboarding.starterTaskSummarise',
        offsetMinutes: 420,
        durationMinutes: 30,
      },
    ],
  },
  health: {
    goalTitleKey: 'onboarding.starterHealthGoal',
    goalDescriptionKey: 'onboarding.starterHealthGoalDescription',
    projectTitleKey: 'onboarding.starterHealthProject',
    tasks: [
      {
        titleKey: 'onboarding.starterTaskWorkout',
        offsetMinutes: 0,
        durationMinutes: 60,
      },
      {
        titleKey: 'onboarding.starterTaskWalk',
        offsetMinutes: 180,
        durationMinutes: 30,
      },
      {
        titleKey: 'onboarding.starterTaskCook',
        offsetMinutes: 330,
        durationMinutes: 45,
      },
      {
        titleKey: 'onboarding.starterTaskStretch',
        offsetMinutes: 540,
        durationMinutes: 30,
      },
    ],
  },
  balance: {
    goalTitleKey: 'onboarding.starterBalanceGoal',
    goalDescriptionKey: 'onboarding.starterBalanceGoalDescription',
    projectTitleKey: 'onboarding.starterBalanceProject',
    tasks: [
      {
        titleKey: 'onboarding.starterTaskFocusBlock',
        offsetMinutes: 0,
        durationMinutes: 90,
      },
      {
        titleKey: 'onboarding.starterTaskMove',
        offsetMinutes: 150,
        durationMinutes: 30,
      },
      {
        titleKey: 'onboarding.starterTaskRead',
        offsetMinutes: 330,
        durationMinutes: 45,
      },
      {
        titleKey: 'onboarding.starterTaskTidy',
        offsetMinutes: 480,
        durationMinutes: 30,
      },
    ],
  },
}

export type StarterPlanTask = {
  title: string
  priority: Priority
  startTime: TimeOfDay
  endTime: TimeOfDay
}

export type StarterPlan = {
  goalTitle: string
  goalDescription: string
  projectTitle: string
  date: string
  tasks: StarterPlanTask[]
}

export function useStarterTemplate() {
  const focus = ref<StarterFocus>('balance')
  const start = ref<StarterStart>('standard')
  const load = ref<StarterLoad>('balanced')

  /**
   * Live preview so the user sees the day before committing to it. The text is
   * translated here, in the language in force, because it becomes the user's data.
   */
  const plan = computed<StarterPlan>(() => {
    const blueprint = BLUEPRINTS[focus.value]
    const dayStart = START_TIME[start.value]
    const t = i18n.global.t

    return {
      goalTitle: t(blueprint.goalTitleKey),
      goalDescription: t(blueprint.goalDescriptionKey),
      projectTitle: t(blueprint.projectTitleKey),
      date: getTodayISODate(),
      tasks: blueprint.tasks.slice(0, BLOCK_COUNT[load.value]).map((task) => {
        const startTime = addMinutesToTime(dayStart, task.offsetMinutes)
        return {
          title: t(task.titleKey),
          priority: PRIORITY.MINOR as Priority,
          startTime,
          endTime: addMinutesToTime(startTime, task.durationMinutes),
        }
      }),
    }
  })

  return { focus, start, load, plan }
}
