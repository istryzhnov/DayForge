import { reactive, watch } from 'vue'
import type { ID, Priority, TimeOfDay } from '../entities/types'
import type { TimerSettings } from '../entities/TimerEntity'
import type { BillingSettings } from '../entities/BillingEntity'
import { PRIORITY } from '../entities/constants'
import { readJson, writeJson } from '../lib/storage'
import {
  IDLE_RETURN_MINUTE_OPTIONS,
  LONG_RUN_HOUR_OPTIONS,
} from './timer/reminders'
import { sanitizeMonthlyIncome } from '../features/analytics/composables/incomeGoal'
import { sanitizeClients, sanitizePayments } from './billing/clients'

const SETTINGS_STORAGE_KEY = 'dayforge-settings-v1'

export const START_VIEW = {
  GOALS: 'goals',
  CALENDAR: 'calendar',
  PLANNED: 'planned',
  ARCHIVE: 'archive',
  TIMER: 'timer',
  ANALYTICS: 'analytics',
} as const

export type StartView = (typeof START_VIEW)[keyof typeof START_VIEW]

export const CLOCK_FORMAT = {
  H24: '24h',
  H12: '12h',
} as const

export type ClockFormat = (typeof CLOCK_FORMAT)[keyof typeof CLOCK_FORMAT]

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
  /** Offer to start the timer on a block that began without one. */
  plannedStartReminder: boolean
  /** In the evening, offer to log planned blocks that have no time yet. */
  endOfDayNudge: boolean
  /** When the evening nudge may appear, local `HH:mm`. */
  endOfDayTime: TimeOfDay
}

/** Stands in for tasks that belong to no project in the calendar filter. */
export const NO_PROJECT_FILTER_ID = '__none__'

export interface CalendarSettings {
  /** Goal ids whose tasks the calendar hides. Unknown ids are harmless. */
  hiddenGoalIds: string[]
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
  /** With startView "goals": the project to open, or null for All Tasks. */
  startGoalId: ID | null
  /** Single-key commands (N, Space, G then A…) while focus is not in a field. */
  keyboardShortcuts: boolean
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

export const CURRENCY_OPTIONS = [
  { id: 'USD', label: 'USD $' },
  { id: 'EUR', label: 'EUR €' },
  { id: 'UAH', label: 'UAH ₴' },
  { id: 'GBP', label: 'GBP £' },
  { id: 'PLN', label: 'PLN zł' },
  { id: 'CAD', label: 'CAD $' },
] as const

export interface GoalSettings {
  /** Earnings target for the calendar month, in timer.currency. Absent means none. */
  monthlyIncome?: number
}

export interface AppSettings {
  notifications: NotificationSettings
  calendar: CalendarSettings
  behavior: BehaviorSettings
  format: FormatSettings
  accessibility: AccessibilitySettings
  timer: TimerSettings
  goals: GoalSettings
  /** Clients and payment status; synced with the rest of the settings row. */
  billing: BillingSettings
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
    plannedStartReminder: true,
    endOfDayNudge: true,
    endOfDayTime: '22:00',
  },
  calendar: {
    hiddenGoalIds: [],
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
    startGoalId: null,
    keyboardShortcuts: true,
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
  timer: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    autoStartBreaks: true,
    autoStartFocus: false,
    defaultCountdownMinutes: 25,
    sound: true,
    hourlyRate: 0,
    currency: 'USD',
    longRunHours: 3,
    idleReturnMinutes: 15,
  },
  // The key is listed so sync treats monthlyIncome as a known field, not an
  // unknown one to hold on to; an undefined value means no goal.
  goals: { monthlyIncome: undefined },
  billing: {
    clients: [],
    payments: [],
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

/** Keeps only the string entries of a list, each one once. */
function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item) => typeof item === 'string'))]
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function asTime(value: unknown, fallback: TimeOfDay): TimeOfDay {
  return typeof value === 'string' && TIME_PATTERN.test(value)
    ? (value as TimeOfDay)
    : fallback
}

/** A section as stored, or nothing if it is not an object. */
function asSection<T>(value: unknown): Partial<T> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Partial<T>)
    : {}
}

/**
 * Stored settings are user-editable JSON, so every known field is re-validated.
 * Fields a newer version added are carried along untouched.
 */
function sanitize(input: unknown): AppSettings {
  const raw = (input ?? {}) as Partial<AppSettings>
  const defaults = DEFAULT_SETTINGS

  const notifications = asSection<NotificationSettings>(raw.notifications)
  const calendar = asSection<CalendarSettings>(raw.calendar)
  const behavior = asSection<BehaviorSettings>(raw.behavior)
  const format = asSection<FormatSettings>(raw.format)
  const accessibility = asSection<AccessibilitySettings>(raw.accessibility)
  const timer = asSection<TimerSettings>(raw.timer)
  const billing = asSection<BillingSettings>(raw.billing)

  return {
    billing: {
      ...billing,
      clients: sanitizeClients(billing.clients),
      payments: sanitizePayments(billing.payments),
    },
    notifications: {
      ...notifications,
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
      plannedStartReminder: asBoolean(
        notifications.plannedStartReminder,
        defaults.notifications.plannedStartReminder,
      ),
      endOfDayNudge: asBoolean(
        notifications.endOfDayNudge,
        defaults.notifications.endOfDayNudge,
      ),
      endOfDayTime: asTime(
        notifications.endOfDayTime,
        defaults.notifications.endOfDayTime,
      ),
    },
    calendar: {
      ...calendar,
      hiddenGoalIds: asStringList(calendar.hiddenGoalIds),
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
      ...behavior,
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
      startGoalId:
        typeof behavior.startGoalId === 'string' && behavior.startGoalId
          ? behavior.startGoalId
          : null,
      keyboardShortcuts: asBoolean(
        behavior.keyboardShortcuts,
        defaults.behavior.keyboardShortcuts,
      ),
    },
    format: {
      ...format,
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
      ...accessibility,
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
    timer: {
      ...timer,
      focusMinutes: clampNumber(
        timer.focusMinutes,
        1,
        180,
        defaults.timer.focusMinutes,
      ),
      shortBreakMinutes: clampNumber(
        timer.shortBreakMinutes,
        1,
        60,
        defaults.timer.shortBreakMinutes,
      ),
      longBreakMinutes: clampNumber(
        timer.longBreakMinutes,
        1,
        120,
        defaults.timer.longBreakMinutes,
      ),
      longBreakEvery: clampNumber(
        timer.longBreakEvery,
        2,
        12,
        defaults.timer.longBreakEvery,
      ),
      autoStartBreaks: asBoolean(
        timer.autoStartBreaks,
        defaults.timer.autoStartBreaks,
      ),
      autoStartFocus: asBoolean(
        timer.autoStartFocus,
        defaults.timer.autoStartFocus,
      ),
      defaultCountdownMinutes: clampNumber(
        timer.defaultCountdownMinutes,
        1,
        240,
        defaults.timer.defaultCountdownMinutes,
      ),
      sound: asBoolean(timer.sound, defaults.timer.sound),
      hourlyRate: clampNumber(
        timer.hourlyRate,
        0,
        100000,
        defaults.timer.hourlyRate,
      ),
      currency: oneOf(
        timer.currency,
        CURRENCY_OPTIONS.map((option) => option.id),
        defaults.timer.currency,
      ),
      longRunHours: oneOf<number>(
        timer.longRunHours,
        LONG_RUN_HOUR_OPTIONS,
        defaults.timer.longRunHours,
      ),
      idleReturnMinutes: oneOf<number>(
        timer.idleReturnMinutes,
        IDLE_RETURN_MINUTE_OPTIONS,
        defaults.timer.idleReturnMinutes,
      ),
    },
    goals: {
      ...asSection<GoalSettings>(raw.goals),
      monthlyIncome: sanitizeMonthlyIncome(
        asSection<GoalSettings>(raw.goals).monthlyIncome,
      ),
    },
  }
}

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
  settings.timer = next.timer
  settings.goals = next.goals
  settings.billing = next.billing
}

const KNOWN_SECTIONS: ReadonlyArray<string> = [
  'notifications',
  'calendar',
  'behavior',
  'format',
  'accessibility',
  'timer',
  'goals',
  'billing',
]

/** Sections a newer version stored, kept so this one does not erase them. */
let unknownSections: Record<string, unknown> = {}

function initialize() {
  if (initialized) return
  initialized = true

  try {
    const stored = readJson<unknown>(SETTINGS_STORAGE_KEY, null)
    if (stored) {
      assign(sanitize(stored))
      unknownSections = Object.fromEntries(
        Object.entries(asSection<Record<string, unknown>>(stored)).filter(
          ([key]) => !KNOWN_SECTIONS.includes(key),
        ),
      )
    }
  } catch {
    // Malformed settings fall back to the defaults already in place.
  }

  watch(
    settings,
    () => {
      applyToDocument()
      writeJson(SETTINGS_STORAGE_KEY, { ...unknownSections, ...settings })
    },
    { deep: true, immediate: true },
  )
}

/** Minutes since midnight, for comparing a `HH:mm` against the clock. */
function minutesOfDay(time: TimeOfDay): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

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
