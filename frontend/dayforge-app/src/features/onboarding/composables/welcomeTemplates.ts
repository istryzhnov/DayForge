import type { AppIconName } from '../../../components/appIconPaths'
import { addMinutesToTime } from '../../../composables/goalSpace/date'
import type { TimeOfDay } from '../../../entities/types'
import type { UseChoice } from './useWelcome'

export type WelcomeTemplateId = 'client' | 'rhythm' | 'study' | 'habits'

export type WelcomeTemplateTask = {
  /** Message key of the title: the title becomes user data once created. */
  titleKey: string
  /** A time block today, when set. */
  start?: TimeOfDay
  minutes?: number
  /** Repeats every day from today. */
  daily?: boolean
}

export type WelcomeTemplate = {
  id: WelcomeTemplateId
  icon: AppIconName
  /** Also the project's default name. */
  nameKey: string
  hintKey: string
  hourlyRate?: number
  tasks: WelcomeTemplateTask[]
}

/** Step 3 of the welcome card: a project with a few tasks, ready to try. */
export const WELCOME_TEMPLATES: readonly WelcomeTemplate[] = [
  {
    id: 'client',
    icon: 'users',
    nameKey: 'onboarding.templateClientName',
    hintKey: 'onboarding.templateClientHint',
    hourlyRate: 40,
    tasks: [
      {
        titleKey: 'onboarding.templateTaskKickoff',
        start: '10:00',
        minutes: 30,
      },
      { titleKey: 'onboarding.templateTaskDraft' },
      { titleKey: 'onboarding.templateTaskClientReview' },
      { titleKey: 'onboarding.templateTaskInvoice' },
    ],
  },
  {
    id: 'rhythm',
    icon: 'calendar',
    nameKey: 'onboarding.templateRhythmName',
    hintKey: 'onboarding.templateRhythmHint',
    tasks: [
      {
        titleKey: 'onboarding.starterTaskFocusBlock',
        start: '09:00',
        minutes: 90,
      },
      { titleKey: 'onboarding.starterTaskMove', start: '11:30', minutes: 30 },
      { titleKey: 'onboarding.starterTaskRead', start: '14:30', minutes: 45 },
    ],
  },
  {
    id: 'study',
    icon: 'target',
    nameKey: 'onboarding.templateStudyName',
    hintKey: 'onboarding.templateStudyHint',
    tasks: [
      {
        titleKey: 'onboarding.starterTaskReadChapter',
        start: '09:00',
        minutes: 60,
      },
      {
        titleKey: 'onboarding.starterTaskPractice',
        start: '10:30',
        minutes: 60,
      },
      { titleKey: 'onboarding.starterTaskReviewNotes' },
    ],
  },
  {
    id: 'habits',
    icon: 'repeat',
    nameKey: 'onboarding.templateHabitsName',
    hintKey: 'onboarding.templateHabitsHint',
    tasks: [
      { titleKey: 'onboarding.starterTaskWorkout', daily: true },
      { titleKey: 'onboarding.starterTaskWalk', daily: true },
      { titleKey: 'onboarding.starterTaskStretch', daily: true },
    ],
  },
]

/** The template that fits the answer on step 2 comes first and is preselected. */
const FIRST_FOR_USE: Record<UseChoice, WelcomeTemplateId> = {
  plan: 'rhythm',
  track: 'study',
  freelance: 'client',
}

export function templatesFor(use: UseChoice | null): WelcomeTemplate[] {
  const firstId = use ? FIRST_FOR_USE[use] : 'rhythm'
  return [...WELCOME_TEMPLATES].sort(
    (a, b) => Number(b.id === firstId) - Number(a.id === firstId),
  )
}

export function findTemplate(id: WelcomeTemplateId): WelcomeTemplate {
  return (
    WELCOME_TEMPLATES.find((item) => item.id === id) ?? WELCOME_TEMPLATES[0]
  )
}

/** "09:00–10:30" for a timed task, or null. */
export function taskTimeRange(task: WelcomeTemplateTask): string | null {
  if (!task.start || !task.minutes) return null
  return `${task.start}–${addMinutesToTime(task.start, task.minutes)}`
}
