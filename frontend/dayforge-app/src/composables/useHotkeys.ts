import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { ID } from '../entities/types'
import { GOAL_STATUS } from '../entities/constants'
import { sortGoals } from './goalSpace/goalOrder'
import type { ActiveView } from '../pages/composables/useMainPageState'
import { useSettings } from './useSettings'
import { useTimer } from './useTimer'
import { tourEvent } from '../features/onboarding/composables/useTour'

export type HotkeyOverlay = 'none' | 'quick-add' | 'shortcuts' | 'search'

const overlay = ref<HotkeyOverlay>('none')

export function useHotkeyOverlay() {
  return {
    overlay,
    openQuickAdd: () => {
      overlay.value = 'quick-add'
      tourEvent('quick-add-opened')
    },
    openShortcuts: () => {
      overlay.value = 'shortcuts'
      tourEvent('help-opened')
    },
    openSearch: () => {
      overlay.value = 'search'
      tourEvent('search-opened')
    },
    closeOverlay: () => {
      overlay.value = 'none'
    },
  }
}

/** `labelKey` and `titleKey` are message keys, rendered with t() where shown. */
export interface ShortcutRow {
  keys: string[]
  labelKey: string
  /** A word translated per language; shown instead of keys[0] when set. */
  wordKey?: string
}

export interface ShortcutGroup {
  titleKey: string
  rows: ShortcutRow[]
}

export function shortcutTitle(label: string, keys: string): string {
  const { settings } = useSettings()
  return settings.behavior.keyboardShortcuts ? `${label} (${keys})` : label
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    titleKey: 'hotkeys.groupAdd',
    rows: [{ keys: ['N'], labelKey: 'hotkeys.rowQuickAdd' }],
  },
  {
    titleKey: 'hotkeys.groupSearch',
    rows: [
      { keys: ['Ctrl+K'], labelKey: 'hotkeys.rowSearch' },
      { keys: ['/'], labelKey: 'hotkeys.rowSearch' },
    ],
  },
  {
    titleKey: 'hotkeys.groupInQuickAdd',
    rows: [
      { keys: ['Enter'], labelKey: 'hotkeys.rowAddTheTask' },
      { keys: ['Shift+Enter'], labelKey: 'hotkeys.rowAddKeepOpen' },
    ],
  },
  {
    titleKey: 'hotkeys.groupTimer',
    rows: [
      { keys: ['Space'], labelKey: 'hotkeys.rowStartPause' },
      { keys: ['S'], labelKey: 'hotkeys.rowSameAsSpace' },
      { keys: ['X'], labelKey: 'hotkeys.rowStop' },
    ],
  },
  {
    titleKey: 'hotkeys.groupGoTo',
    rows: [
      { keys: ['G', 'A'], labelKey: 'hotkeys.rowAllProjects' },
      { keys: ['G', 'C'], labelKey: 'hotkeys.rowCalendar' },
      { keys: ['G', 'T'], labelKey: 'hotkeys.rowTimer' },
      { keys: ['G', 'Y'], labelKey: 'hotkeys.rowAnalytics' },
      { keys: ['['], labelKey: 'hotkeys.rowPreviousProject' },
      { keys: [']'], labelKey: 'hotkeys.rowNextProject' },
    ],
  },
  {
    titleKey: 'hotkeys.groupHelp',
    rows: [
      { keys: ['?'], labelKey: 'hotkeys.rowThisList' },
      { keys: ['Esc'], labelKey: 'hotkeys.rowCloseOpenPanel' },
    ],
  },
]

/** Keywords are typed as written; the day words are shown in the language's own word. */
export const QUICK_ADD_SYNTAX: ShortcutRow[] = [
  {
    keys: ['#Work'],
    labelKey: 'hotkeys.syntaxProject',
  },
  {
    keys: ['#New_name'],
    labelKey: 'hotkeys.syntaxNewProject',
  },
  {
    keys: ['today'],
    wordKey: 'hotkeys.dayWordToday',
    labelKey: 'hotkeys.syntaxToday',
  },
  {
    keys: ['tomorrow'],
    wordKey: 'hotkeys.dayWordTomorrow',
    labelKey: 'hotkeys.syntaxTomorrow',
  },
  {
    keys: ['25.10.2026'],
    labelKey: 'hotkeys.syntaxDate',
  },
]

const GO_TIMEOUT_MS = 1000

const NON_TEXT_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'range',
  'color',
  'file',
  'button',
  'submit',
  'reset',
])

const ACTIVATABLE_SELECTOR =
  'button, a[href], summary, input, [role="button"], [role="checkbox"], [role="switch"], [role="tab"]'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLTextAreaElement) return true
  if (target instanceof HTMLSelectElement) return true
  if (target instanceof HTMLInputElement) {
    return !NON_TEXT_INPUT_TYPES.has(target.type)
  }
  return false
}

function isActivatable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.matches(ACTIVATABLE_SELECTOR)
}

interface HotkeyActions {
  goals: Ref<Goal[]>
  activeGoalId: Ref<ID | null>
  selectView: (view: ActiveView) => void
  selectGoal: (goalId: ID | null) => void
}

export function useHotkeys(actions: HotkeyActions) {
  const { settings } = useSettings()
  const timer = useTimer()
  const { overlay, openQuickAdd, openShortcuts, openSearch } =
    useHotkeyOverlay()

  let awaitingGo = false
  let goTimerId: number | undefined

  const goTargets = new Map<string, () => void>([
    ['a', () => actions.selectGoal(null)],
    ['c', () => actions.selectView('calendar')],
    ['t', () => actions.selectView('timer')],
    ['y', () => actions.selectView('analytics')],
  ])

  function cancelGo() {
    awaitingGo = false
    if (goTimerId !== undefined) window.clearTimeout(goTimerId)
    goTimerId = undefined
  }

  function cycleGoal(step: number) {
    const visible = sortGoals(actions.goals.value).filter(
      (goal) => goal.status !== GOAL_STATUS.ARCHIVED,
    )
    if (visible.length === 0) return

    const index = visible.findIndex(
      (goal) => goal.id === actions.activeGoalId.value,
    )
    const next =
      index === -1
        ? step > 0
          ? 0
          : visible.length - 1
        : (index + step + visible.length) % visible.length
    actions.selectGoal(visible[next].id)
  }

  /**
   * The key by its place on the keyboard, so shortcuts work on any layout:
   * on a Ukrainian layout N types "т", but its code is still KeyN.
   */
  function layoutFreeKey(event: KeyboardEvent): string {
    const { code } = event
    if (code.startsWith('Key')) return code.slice(3).toLowerCase()
    if (code === 'Space') return ' '
    if (code === 'BracketLeft') return '['
    if (code === 'BracketRight') return ']'
    if (code === 'Slash') return event.shiftKey ? '?' : '/'
    return event.key.toLowerCase()
  }

  function onKeydown(event: KeyboardEvent) {
    if (!settings.behavior.keyboardShortcuts) return
    if (overlay.value !== 'none') return
    if (event.altKey) return
    if (document.querySelector('[aria-modal="true"]')) return

    const key = layoutFreeKey(event)

    if ((event.ctrlKey || event.metaKey) && key === 'k') {
      event.preventDefault()
      cancelGo()
      openSearch()
      return
    }

    if (event.ctrlKey || event.metaKey) return
    if (isTypingTarget(event.target)) return

    const pendingGo = awaitingGo
    cancelGo()

    const goTarget = goTargets.get(key)
    if (pendingGo && goTarget) {
      event.preventDefault()
      goTarget()
      return
    }

    if (key === 'n') {
      event.preventDefault()
      openQuickAdd()
      return
    }

    if (key === ' ' || key === 's') {
      if (key === ' ' && isActivatable(event.target)) return
      event.preventDefault()
      timer.toggle()
      return
    }

    if (key === 'x') {
      event.preventDefault()
      if (timer.isLive.value) timer.stop()
      return
    }

    if (key === 'g') {
      event.preventDefault()
      awaitingGo = true
      goTimerId = window.setTimeout(cancelGo, GO_TIMEOUT_MS)
      return
    }

    if (key === '[' || key === ']') {
      event.preventDefault()
      cycleGoal(key === '[' ? -1 : 1)
      return
    }

    if (key === '/') {
      event.preventDefault()
      openSearch()
      return
    }

    if (key === '?') {
      event.preventDefault()
      openShortcuts()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
    cancelGo()
  })
}
