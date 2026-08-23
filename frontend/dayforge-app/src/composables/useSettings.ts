import { reactive, watch } from 'vue'
import type { Priority, TimeOfDay } from '../entities/types'
import { PRIORITY } from '../entities/constants'

/**
 * Everything the user can configure that is *not* a colour.
 *
 * Kept apart from `useTheme` on purpose: that composable's whole job is writing
 * CSS custom properties onto `<html>`, while these are plain preferences that
 * other composables read. Only the accessibility group touches the document,
 * and it does so through the same token/attribute mechanism as the theme.
 */

const SETTINGS_STORAGE_KEY = 'dayforge-settings-v1'

export const START_VIEW = {
  GOALS: 'goals',
  CALENDAR: 'calendar',
  PLANNED: 'planned',
  ARCHIVE: 'archive',
} as const

export type StartView = (typeof START_VIEW)[keyof typeof START_VIEW]

export const CLOCK_FORMAT = {
  H24: '24h',
  H12: '12h',
} as const

export type ClockFormat = (typeof CLOCK_FORMAT)[keyof typeof CLOCK_FORMAT]

/**
 * Date formatting only — the interface text itself is still English. The two
 * used to disagree: dates were hard-coded to `uk-UA` in three different files
 * while every label around them was in English.
 */
export const LOCALE_OPTIONS = [
  { id: 'uk-UA', label: 'Українська' },
  { id: 'en-GB', label: 'English (UK)' },
  { id: 'en-US', label: 'English (US)' },
  { id: 'de-DE', label: 'Deutsch' },
  { id: 'pl-PL', label: 'Polski' },
] as const

export type LocaleId = (typeof LOCALE_OPTIONS)[number]['id']

export interface NotificationSettings {
  /** How long before a task starts the reminder fires. */
  leadMinutes: number
  sound: boolean
  /** 0–1, applied to the oscillator's gain. */
  volume: number
  /** Keep beeping until acknowledged, or chime once. */
  repeatAlert: boolean
  quietHours: boolean
  quietFrom: TimeOfDay
  quietTo: TimeOfDay
}

export interface CalendarSettings {
  /** Grid snapping in minutes: how coarse a drag or resize lands. */
  snapMinutes: number
  /** Height of one hour on the day/week grid, in px. */
  hourHeight: number
  defaultDurationMinutes: number
  defaultStartTime: TimeOfDay
  /** Hours of booked work the month view treats as a full day. */
  fullDayHours: number
  /** 1 = Monday, 0 = Sunday. */
  weekStartsOn: 0 | 1
}

export interface BehaviorSettings {
  startView: StartView
  defaultPriority: Priority
  /** Roll unfinished open tasks onto today. Off leaves them on their own day. */
  carryForward: boolean
  undoWindowSeconds: number
  /** Open the first project on load instead of "All Projects". */
  autoSelectFirstGoal: boolean
}

export interface FormatSettings {
  locale: LocaleId
  clock: ClockFormat
}

export interface AccessibilitySettings {
  /** Multiplier on every font size. */
  textScale: number
  /** Roomier hit areas for buttons, rows and circles. */
  largeTargets: boolean
  /** Firmer borders and text, no translucent surfaces. */
  highContrast: boolean
}

export interface AppSettings {
  notifications: NotificationSettings
  calendar: CalendarSettings
  behavior: BehaviorSettings
  format: FormatSettings
  accessibility: AccessibilitySettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    leadMinutes: 5,
    sound: true,
    volume: 0.5,
    repeatAlert: true,
    quietHours: false,
    quietFrom: '22:00',
    quietTo: '08:00',
  },
  calendar: {
    snapMinutes: 15,
    hourHeight: 60,
    defaultDurationMinutes: 60,
    defaultStartTime: '09:00',
    fullDayHours: 8,
    weekStartsOn: 1,
  },
  behavior: {
    startView: START_VIEW.GOALS,
    defaultPriority: PRIORITY.MINOR,
    carryForward: true,
    undoWindowSeconds: 9,
    autoSelectFirstGoal: true,
  },
  format: {
    locale: 'uk-UA',
    clock: CLOCK_FORMAT.H24,
  },
  accessibility: {
    textScale: 1,
    largeTargets: false,
    highContrast: false,
  },
}

const settings = reactive<AppSettings>(clone(DEFAULT_SETTINGS))

let initialized = false

function clone(value: AppSettings): AppSettings {
  return JSON.parse(JSON.stringify(value)) as AppSettings
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function asTime(value: unknown, fallback: TimeOfDay): TimeOfDay {
  return typeof value === 'string' && TIME_PATTERN.test(value)
    ? (value as TimeOfDay)
    : fallback
}

/** Stored settings are user-editable JSON, so every field is re-validated. */
function sanitize(input: unknown): AppSettings {
  const raw = (input ?? {}) as Partial<AppSettings>
  const defaults = DEFAULT_SETTINGS

  const notifications = (raw.notifications ??
    {}) as Partial<NotificationSettings>
  const calendar = (raw.calendar ?? {}) as Partial<CalendarSettings>
  const behavior = (raw.behavior ?? {}) as Partial<BehaviorSettings>
  const format = (raw.format ?? {}) as Partial<FormatSettings>
  const accessibility = (raw.accessibility ??
    {}) as Partial<AccessibilitySettings>

  return {
    notifications: {
      leadMinutes: clampNumber(
        notifications.leadMinutes,
        1,
        120,
        defaults.notifications.leadMinutes,
      ),
      sound: asBoolean(notifications.sound, defaults.notifications.sound),
      volume: clampNumber(
        notifications.volume,
        0,
        1,
        defaults.notifications.volume,
      ),
      repeatAlert: asBoolean(
        notifications.repeatAlert,
        defaults.notifications.repeatAlert,
      ),
      quietHours: asBoolean(
        notifications.quietHours,
        defaults.notifications.quietHours,
      ),
      quietFrom: asTime(
        notifications.quietFrom,
        defaults.notifications.quietFrom,
      ),
      quietTo: asTime(notifications.quietTo, defaults.notifications.quietTo),
    },
    calendar: {
      snapMinutes: oneOf(
        calendar.snapMinutes,
        [5, 10, 15, 30, 60],
        defaults.calendar.snapMinutes,
      ),
      hourHeight: clampNumber(
        calendar.hourHeight,
        30,
        160,
        defaults.calendar.hourHeight,
      ),
      defaultDurationMinutes: clampNumber(
        calendar.defaultDurationMinutes,
        5,
        480,
        defaults.calendar.defaultDurationMinutes,
      ),
      defaultStartTime: asTime(
        calendar.defaultStartTime,
        defaults.calendar.defaultStartTime,
      ),
      fullDayHours: clampNumber(
        calendar.fullDayHours,
        1,
        16,
        defaults.calendar.fullDayHours,
      ),
      weekStartsOn: oneOf(
        calendar.weekStartsOn,
        [0, 1] as const,
        defaults.calendar.weekStartsOn,
      ),
    },
    behavior: {
      startView: oneOf(
        behavior.startView,
        Object.values(START_VIEW),
        defaults.behavior.startView,
      ),
      defaultPriority: oneOf(
        behavior.defaultPriority,
        Object.values(PRIORITY),
        defaults.behavior.defaultPriority,
      ),
      carryForward: asBoolean(
        behavior.carryForward,
        defaults.behavior.carryForward,
      ),
      undoWindowSeconds: clampNumber(
        behavior.undoWindowSeconds,
        3,
        60,
        defaults.behavior.undoWindowSeconds,
      ),
      autoSelectFirstGoal: asBoolean(
        behavior.autoSelectFirstGoal,
        defaults.behavior.autoSelectFirstGoal,
      ),
    },
    format: {
      locale: oneOf(
        format.locale,
        LOCALE_OPTIONS.map((option) => option.id),
        defaults.format.locale,
      ),
      clock: oneOf(
        format.clock,
        Object.values(CLOCK_FORMAT),
        defaults.format.clock,
      ),
    },
    accessibility: {
      textScale: clampNumber(
        accessibility.textScale,
        0.8,
        1.6,
        defaults.accessibility.textScale,
      ),
      largeTargets: asBoolean(
        accessibility.largeTargets,
        defaults.accessibility.largeTargets,
      ),
      highContrast: asBoolean(
        accessibility.highContrast,
        defaults.accessibility.highContrast,
      ),
    },
  }
}

/**
 * The accessibility group is the only one with a visual side, so it goes onto
 * the document the same way the theme does: a scale token plus two attributes
 * that `settings.css` reacts to.
 */
function applyToDocument() {
  const root = document.documentElement
  root.style.setProperty(
    '--text-scale',
    String(settings.accessibility.textScale),
  )
  root.dataset.targets = settings.accessibility.largeTargets
    ? 'large'
    : 'normal'
  root.dataset.contrast = settings.accessibility.highContrast
    ? 'high'
    : 'normal'
}

function assign(next: AppSettings) {
  settings.notifications = next.notifications
  settings.calendar = next.calendar
  settings.behavior = next.behavior
  settings.format = next.format
  settings.accessibility = next.accessibility
}

function initialize() {
  if (initialized) return
  initialized = true

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) assign(sanitize(JSON.parse(raw)))
  } catch {
    // Malformed settings fall back to the defaults already in place.
  }

  watch(
    settings,
    () => {
      applyToDocument()
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    },
    { deep: true, immediate: true },
  )
}

/** Minutes since midnight, for comparing a `HH:mm` against the clock. */
function minutesOfDay(time: TimeOfDay): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Quiet hours normally wrap past midnight (22:00 → 08:00), so the window is
 * "outside the gap" rather than "inside the range" whenever `from` is later
 * than `to`.
 */
export function isWithinQuietHours(
  date: Date,
  from: TimeOfDay,
  to: TimeOfDay,
): boolean {
  const now = date.getHours() * 60 + date.getMinutes()
  const start = minutesOfDay(from)
  const end = minutesOfDay(to)
  if (start === end) return false
  return start < end ? now >= start && now < end : now >= start || now < end
}

export function useSettings() {
  initialize()

  function update<K extends keyof AppSettings>(
    section: K,
    patch: Partial<AppSettings[K]>,
  ) {
    assign(
      sanitize({ ...settings, [section]: { ...settings[section], ...patch } }),
    )
  }

  function resetSection<K extends keyof AppSettings>(section: K) {
    assign(sanitize({ ...settings, [section]: DEFAULT_SETTINGS[section] }))
  }

  function resetAll() {
    assign(clone(DEFAULT_SETTINGS))
  }

  return { settings, update, resetSection, resetAll }
}
