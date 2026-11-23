/**
 * The optional parts of the app the user can switch off. Pure data and helpers
 * only, so settings normalisation and the screens share one definition.
 *
 * A module that is off is hidden from navigation and UI. Its data is never
 * touched: switching it back on shows everything again.
 */

export const MODULE_ID = {
  NOTES: 'notes',
  SUBTASKS: 'subtasks',
  REMINDERS: 'reminders',
  BOARD: 'board',
  CALENDAR: 'calendar',
  TIMER: 'timer',
  HABITS: 'habits',
  EARNINGS: 'earnings',
  CLIENTS: 'clients',
  ANALYTICS: 'analytics',
} as const

export type ModuleId = (typeof MODULE_ID)[keyof typeof MODULE_ID]

export const MODULE_IDS: readonly ModuleId[] = Object.values(MODULE_ID)

/** Module id → boolean. Unknown ids written by a newer build are kept as they are. */
export type ModuleSettings = Record<string, boolean>

/** A module that cannot work while another one is off. */
export const MODULE_NEEDS: Partial<Record<ModuleId, ModuleId>> = {
  [MODULE_ID.CLIENTS]: MODULE_ID.EARNINGS,
}

/** Tab views that belong to a module. Other views are always available. */
export const VIEW_MODULE: Partial<Record<string, ModuleId>> = {
  calendar: MODULE_ID.CALENDAR,
  timer: MODULE_ID.TIMER,
  analytics: MODULE_ID.ANALYTICS,
}

/** Every module on, which is what existing users and missing keys get. */
export function allModulesOn(): ModuleSettings {
  return Object.fromEntries(MODULE_IDS.map((id) => [id, true]))
}

/**
 * Stored modules as they are read: missing known ids are on, booleans for
 * unknown ids are kept, anything else is dropped.
 */
export function sanitizeModules(raw: unknown): ModuleSettings {
  const source: Record<string, unknown> =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const result: ModuleSettings = {}
  Object.entries(source).forEach(([id, value]) => {
    if (typeof value === 'boolean') result[id] = value
  })
  MODULE_IDS.forEach((id) => {
    if (typeof result[id] !== 'boolean') result[id] = true
  })
  return result
}

/** Whether a module is on, taking its requirement into account. */
export function isModuleOn(modules: ModuleSettings, id: string): boolean {
  if (modules[id] === false) return false
  const need = MODULE_NEEDS[id as ModuleId]
  return need === undefined ? true : isModuleOn(modules, need)
}

export interface ModulePreset {
  id: 'simple' | 'study' | 'freelance'
  /** Module ids that are on; everything else is off. */
  on: readonly ModuleId[]
}

/** Quick-start sets, as on the Modules mockup. */
export const MODULE_PRESETS: readonly ModulePreset[] = [
  { id: 'simple', on: [] },
  {
    id: 'study',
    on: [
      MODULE_ID.NOTES,
      MODULE_ID.SUBTASKS,
      MODULE_ID.CALENDAR,
      MODULE_ID.TIMER,
      MODULE_ID.HABITS,
    ],
  },
  {
    id: 'freelance',
    on: [
      MODULE_ID.NOTES,
      MODULE_ID.SUBTASKS,
      MODULE_ID.CALENDAR,
      MODULE_ID.TIMER,
      MODULE_ID.EARNINGS,
      MODULE_ID.CLIENTS,
      MODULE_ID.ANALYTICS,
    ],
  },
]

/** The full set a preset means: every known module, on or off. */
export function presetModules(preset: ModulePreset): ModuleSettings {
  return Object.fromEntries(
    MODULE_IDS.map((id) => [id, preset.on.includes(id)]),
  )
}

/** The preset whose set matches the modules exactly, or null if none does. */
export function matchingPreset(
  modules: ModuleSettings,
): ModulePreset['id'] | null {
  const found = MODULE_PRESETS.find((preset) =>
    MODULE_IDS.every((id) => (modules[id] === true) === preset.on.includes(id)),
  )
  return found?.id ?? null
}

/** Module groups as the Modules screen lists them. */
export const MODULE_GROUPS: readonly {
  id: 'tasks' | 'time' | 'money'
  modules: readonly ModuleId[]
}[] = [
  {
    id: 'tasks',
    modules: [
      MODULE_ID.NOTES,
      MODULE_ID.SUBTASKS,
      MODULE_ID.REMINDERS,
      MODULE_ID.BOARD,
    ],
  },
  {
    id: 'time',
    modules: [MODULE_ID.CALENDAR, MODULE_ID.TIMER, MODULE_ID.HABITS],
  },
  {
    id: 'money',
    modules: [MODULE_ID.EARNINGS, MODULE_ID.CLIENTS, MODULE_ID.ANALYTICS],
  },
]
