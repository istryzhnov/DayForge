import {
  BACKGROUND_PATTERN,
  DENSITY,
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
import { GOAL_STATUS, PRIORITY } from '../../../entities/constants'
import type { GoalStatus, Priority } from '../../../entities/types'
import type { Language } from '../../../i18n/languages'

/**
 * Options whose labels are translated: `labelKey` is a full message key,
 * rendered with t() where the option is shown, so a language switch updates it.
 */
export type SettingOption<T> = { id: T; labelKey: string }

/**
 * Language names are written in their own language, so they are never
 * translated. A language is not a message, so it has no key.
 */
export const LANGUAGE_OPTIONS: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'uk', label: 'Українська' },
  { id: 'pl', label: 'Polski' },
  { id: 'de', label: 'Deutsch' },
  { id: 'zh', label: '中文' },
  { id: 'es', label: 'Español' },
]

/** Minutes, shared by the reminder lead time and the grid's snapping. */
export const MINUTE_STEPS = [5, 10, 15, 30, 60]

export const TASK_DURATIONS = [15, 30, 45, 60, 90, 120]

export const FOCUS_LENGTHS = [15, 20, 25, 30, 45, 50]

export const BREAK_LENGTHS = [3, 5, 10, 15, 20, 30]

export const COUNTDOWN_LENGTHS = [5, 10, 15, 25, 45, 60]

/** Focus phases between long breaks. */
export const LONG_BREAK_EVERY = [2, 3, 4, 5, 6]

export const DENSITY_OPTIONS: SettingOption<Density>[] = [
  { id: DENSITY.COMPACT, labelKey: 'settings.densityCompact' },
  { id: DENSITY.COZY, labelKey: 'settings.densityCozy' },
  { id: DENSITY.ROOMY, labelKey: 'settings.densityRoomy' },
]

export const PATTERN_OPTIONS: SettingOption<BackgroundPattern>[] = [
  { id: BACKGROUND_PATTERN.GLOW, labelKey: 'settings.patternGlow' },
  { id: BACKGROUND_PATTERN.GRID, labelKey: 'settings.patternGrid' },
  { id: BACKGROUND_PATTERN.DOTS, labelKey: 'settings.patternDots' },
  { id: BACKGROUND_PATTERN.NONE, labelKey: 'settings.patternPlain' },
]

/** Message key of each typeface name. Manrope is a proper noun and stays as it is. */
export const FONT_LABEL_KEYS: Record<FontOption, string> = {
  [FONT_OPTION.MANROPE]: 'settings.fontManrope',
  [FONT_OPTION.SYSTEM]: 'settings.fontSystem',
  [FONT_OPTION.SERIF]: 'settings.fontSerif',
  [FONT_OPTION.MONO]: 'settings.fontMono',
  [FONT_OPTION.ROUNDED]: 'settings.fontRounded',
}

export const FONT_OPTIONS: { id: FontOption; labelKey: string }[] = (
  Object.values(FONT_OPTION) as FontOption[]
).map((font) => ({ id: font, labelKey: FONT_LABEL_KEYS[font] }))

export const MOTION_OPTIONS: SettingOption<Motion>[] = [
  { id: MOTION.FULL, labelKey: 'settings.motionFull' },
  { id: MOTION.REDUCED, labelKey: 'settings.motionReduced' },
]

export const START_VIEW_OPTIONS: SettingOption<StartView>[] = [
  { id: START_VIEW.GOALS, labelKey: 'settings.viewAllTasks' },
  { id: START_VIEW.TIMER, labelKey: 'settings.viewTimer' },
  { id: START_VIEW.CALENDAR, labelKey: 'settings.viewCalendar' },
  { id: START_VIEW.ANALYTICS, labelKey: 'settings.viewAnalytics' },
  { id: START_VIEW.PLANNED, labelKey: 'settings.viewPlanned' },
  { id: START_VIEW.ARCHIVE, labelKey: 'settings.viewArchive' },
]

export const PRIORITY_OPTIONS: SettingOption<Priority>[] = [
  { id: PRIORITY.MINOR, labelKey: 'settings.priorityTask' },
  { id: PRIORITY.MAJOR, labelKey: 'settings.priorityProject' },
]

export const GOAL_STATUS_OPTIONS: SettingOption<GoalStatus>[] = [
  { id: GOAL_STATUS.ACTIVE, labelKey: 'settings.statusActive' },
  { id: GOAL_STATUS.PAUSED, labelKey: 'settings.statusPaused' },
  { id: GOAL_STATUS.ARCHIVED, labelKey: 'settings.statusArchived' },
]

/** Message keys: the hint under the status chips is translated where it is shown. */
export const GOAL_STATUS_HINTS: Record<GoalStatus, string> = {
  [GOAL_STATUS.ACTIVE]: 'settings.projectStatusHintActive',
  [GOAL_STATUS.PAUSED]: 'settings.projectStatusHintPaused',
  [GOAL_STATUS.ARCHIVED]: 'settings.projectStatusHintArchived',
}

export const CLOCK_OPTIONS: SettingOption<ClockFormat>[] = [
  { id: CLOCK_FORMAT.H24, labelKey: 'settings.clock24' },
  { id: CLOCK_FORMAT.H12, labelKey: 'settings.clock12' },
]

export const WEEK_START_OPTIONS: SettingOption<0 | 1>[] = [
  { id: 1, labelKey: 'settings.weekMonday' },
  { id: 0, labelKey: 'settings.weekSunday' },
]
