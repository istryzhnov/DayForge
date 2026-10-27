import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { ID } from '../entities/types'
import { GOAL_STATUS } from '../entities/constants'
import { sortGoals } from './goalSpace/goalOrder'
import type { ActiveView } from '../pages/composables/useMainPageState'
import { useSettings } from './useSettings'
import { useTimer } from './useTimer'

export type HotkeyOverlay = 'none' | 'quick-add' | 'shortcuts' | 'search'

const overlay = ref<HotkeyOverlay>('none')

export function useHotkeyOverlay() {
  return {
    overlay,
    openQuickAdd: () => {
      overlay.value = 'quick-add'
    },
    openShortcuts: () => {
      overlay.value = 'shortcuts'
    },
    openSearch: () => {
      overlay.value = 'search'
    },
    closeOverlay: () => {
      overlay.value = 'none'
    },
  }
}

export interface ShortcutRow {
  keys: string[]
  label: string
}

export interface ShortcutGroup {
  title: string
  rows: ShortcutRow[]
}

export function shortcutTitle(label: string, keys: string): string {
  const { settings } = useSettings()
  return settings.behavior.keyboardShortcuts ? `${label} (${keys})` : label
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Add',
    rows: [{ keys: ['N'], label: 'Quick add a task' }],
  },
  {
    title: 'Search',
    rows: [
      { keys: ['Ctrl+K'], label: 'Search projects and tasks' },
      { keys: ['/'], label: 'Search projects and tasks' },
    ],
  },
  {
    title: 'In quick add',
    rows: [
      { keys: ['Enter'], label: 'Add the task' },
      { keys: ['Shift+Enter'], label: 'Add and keep the box open' },
    ],
  },
  {
    title: 'Timer',
    rows: [
      { keys: ['Space'], label: 'Start, pause or carry on' },
      { keys: ['S'], label: 'Same as Space' },
      { keys: ['X'], label: 'Stop' },
    ],
  },
  {
    title: 'Go to',
    rows: [
      { keys: ['G', 'A'], label: 'All Projects' },
      { keys: ['G', 'C'], label: 'Calendar' },
      { keys: ['G', 'T'], label: 'Timer' },
      { keys: ['G', 'Y'], label: 'Analytics' },
      { keys: ['['], label: 'Previous project' },
      { keys: [']'], label: 'Next project' },
    ],
  },
  {
    title: 'Help',
    rows: [
      { keys: ['?'], label: 'This list' },
      { keys: ['Esc'], label: 'Close the open panel' },
    ],
  },
]

export const QUICK_ADD_SYNTAX: ShortcutRow[] = [
  {
    keys: ['#Work'],
    label: 'Put it in a project; pick from the list as you type',
  },
  {
    keys: ['#New_name'],
    label: 'Start a new project (underscores become spaces)',
  },
  { keys: ['today'], label: 'Schedule for today (also “сьогодні”)' },
  { keys: ['tomorrow'], label: 'Schedule for tomorrow (also “завтра”)' },
  {
    keys: ['25.10.2026'],
    label: 'Schedule for a date; 25.10 means the next 25 October',
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
