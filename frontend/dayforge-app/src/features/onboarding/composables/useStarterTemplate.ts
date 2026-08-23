import { computed, ref } from 'vue'
import type { Priority, TimeOfDay } from '../../../entities/types'
import { PRIORITY } from '../../../entities/constants'
import {
  addMinutesToTime,
  getTodayISODate,
} from '../../../composables/goalSpace/date'

export type StarterFocus = 'work' | 'study' | 'health' | 'balance'
export type StarterStart = 'early' | 'standard' | 'late'
export type StarterLoad = 'light' | 'balanced' | 'full'

type BlueprintTask = {
  title: string
  /** Minutes after the day's start time. */
  offsetMinutes: number
  durationMinutes: number
}

type Blueprint = {
  goalTitle: string
  goalDescription: string
  projectTitle: string
  tasks: BlueprintTask[]
}

export const FOCUS_OPTIONS = [
  { value: 'work', label: 'Work', hint: 'Deep work and shipping' },
  { value: 'study', label: 'Study', hint: 'Reading and practice' },
  { value: 'health', label: 'Health', hint: 'Training and recovery' },
  { value: 'balance', label: 'A bit of everything', hint: 'Mixed day' },
] as const

export const START_OPTIONS = [
  { value: 'early', label: 'Early', hint: 'Day starts 07:00' },
  { value: 'standard', label: 'Standard', hint: 'Day starts 09:00' },
  { value: 'late', label: 'Late', hint: 'Day starts 11:00' },
] as const

export const LOAD_OPTIONS = [
  { value: 'light', label: 'Light', hint: '2 blocks' },
  { value: 'balanced', label: 'Balanced', hint: '3 blocks' },
  { value: 'full', label: 'Full', hint: '4 blocks' },
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
    goalTitle: 'Work',
    goalDescription: 'Focused output',
    projectTitle: 'This week at work',
    tasks: [
      { title: 'Deep work block', offsetMinutes: 0, durationMinutes: 90 },
      { title: 'Clear the inbox', offsetMinutes: 120, durationMinutes: 30 },
      { title: 'Plan tomorrow', offsetMinutes: 300, durationMinutes: 30 },
      { title: 'Review what shipped', offsetMinutes: 420, durationMinutes: 45 },
    ],
  },
  study: {
    goalTitle: 'Study',
    goalDescription: 'Learning that sticks',
    projectTitle: 'Current course',
    tasks: [
      { title: 'Read one chapter', offsetMinutes: 0, durationMinutes: 60 },
      { title: 'Practice problems', offsetMinutes: 90, durationMinutes: 60 },
      { title: 'Review notes', offsetMinutes: 240, durationMinutes: 30 },
      {
        title: 'Summarise what I learned',
        offsetMinutes: 420,
        durationMinutes: 30,
      },
    ],
  },
  health: {
    goalTitle: 'Health',
    goalDescription: 'Move, eat, recover',
    projectTitle: 'Training week',
    tasks: [
      { title: 'Morning workout', offsetMinutes: 0, durationMinutes: 60 },
      { title: 'Walk outside', offsetMinutes: 180, durationMinutes: 30 },
      { title: 'Cook a proper meal', offsetMinutes: 330, durationMinutes: 45 },
      {
        title: 'Stretch and wind down',
        offsetMinutes: 540,
        durationMinutes: 30,
      },
    ],
  },
  balance: {
    goalTitle: 'My day',
    goalDescription: 'A bit of everything',
    projectTitle: 'Daily rhythm',
    tasks: [
      { title: 'Focus block', offsetMinutes: 0, durationMinutes: 90 },
      { title: 'Move for 30 minutes', offsetMinutes: 150, durationMinutes: 30 },
      { title: 'Read something', offsetMinutes: 330, durationMinutes: 45 },
      { title: 'Tidy up loose ends', offsetMinutes: 480, durationMinutes: 30 },
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

  /** Live preview so the user sees the day before committing to it. */
  const plan = computed<StarterPlan>(() => {
    const blueprint = BLUEPRINTS[focus.value]
    const dayStart = START_TIME[start.value]

    return {
      goalTitle: blueprint.goalTitle,
      goalDescription: blueprint.goalDescription,
      projectTitle: blueprint.projectTitle,
      date: getTodayISODate(),
      tasks: blueprint.tasks.slice(0, BLOCK_COUNT[load.value]).map((task) => {
        const startTime = addMinutesToTime(dayStart, task.offsetMinutes)
        return {
          title: task.title,
          priority: PRIORITY.MINOR as Priority,
          startTime,
          endTime: addMinutesToTime(startTime, task.durationMinutes),
        }
      }),
    }
  })

  return { focus, start, load, plan }
}
