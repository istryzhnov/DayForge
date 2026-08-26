import {
  BACKGROUND_PATTERN,
  DENSITY,
  FONT_LABELS,
  FONT_OPTION,
  MOTION,
  type BackgroundPattern,
  type Density,
  type FontOption,
  type Motion,
} from '../../../composables/theme/tokens'
import {
  CLOCK_FORMAT,
  START_VIEW,
  type ClockFormat,
  type StartView,
} from '../../../composables/useSettings'
import { PRIORITY } from '../../../entities/constants'
import type { Priority } from '../../../entities/types'

export type SettingOption<T> = { id: T; label: string }

/** Minutes, shared by the reminder lead time and the grid's snapping. */
export const MINUTE_STEPS = [5, 10, 15, 30, 60]

export const TASK_DURATIONS = [15, 30, 45, 60, 90, 120]

export const DENSITY_OPTIONS: SettingOption<Density>[] = [
  { id: DENSITY.COMPACT, label: 'Compact' },
  { id: DENSITY.COZY, label: 'Cozy' },
  { id: DENSITY.ROOMY, label: 'Roomy' },
]

export const PATTERN_OPTIONS: SettingOption<BackgroundPattern>[] = [
  { id: BACKGROUND_PATTERN.GLOW, label: 'Glow' },
  { id: BACKGROUND_PATTERN.GRID, label: 'Grid' },
  { id: BACKGROUND_PATTERN.DOTS, label: 'Dots' },
  { id: BACKGROUND_PATTERN.NONE, label: 'Plain' },
]

export const FONT_OPTIONS: SettingOption<FontOption>[] = (
  Object.values(FONT_OPTION) as FontOption[]
).map((font) => ({ id: font, label: FONT_LABELS[font] }))

export const MOTION_OPTIONS: SettingOption<Motion>[] = [
  { id: MOTION.FULL, label: 'Full' },
  { id: MOTION.REDUCED, label: 'Reduced' },
]

export const START_VIEW_OPTIONS: SettingOption<StartView>[] = [
  { id: START_VIEW.GOALS, label: 'Projects' },
  { id: START_VIEW.CALENDAR, label: 'Calendar' },
  { id: START_VIEW.PLANNED, label: 'Planned' },
  { id: START_VIEW.ARCHIVE, label: 'What I did' },
]

export const PRIORITY_OPTIONS: SettingOption<Priority>[] = [
  { id: PRIORITY.MINOR, label: 'Task' },
  { id: PRIORITY.MAJOR, label: 'Project' },
]

export const CLOCK_OPTIONS: SettingOption<ClockFormat>[] = [
  { id: CLOCK_FORMAT.H24, label: '24-hour' },
  { id: CLOCK_FORMAT.H12, label: '12-hour' },
]

export const WEEK_START_OPTIONS: SettingOption<0 | 1>[] = [
  { id: 1, label: 'Monday' },
  { id: 0, label: 'Sunday' },
]
