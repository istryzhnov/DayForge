import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { ID } from '../entities/types'
import { GOAL_STATUS } from '../entities/constants'
import type { ActiveView } from '../pages/composables/useMainPageState'
import { useSettings } from './useSettings'
import { useTimer } from './useTimer'

export type HotkeyOverlay = 'none' | 'quick-add' | 'shortcuts'

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

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Add',
    rows: [
      { keys: ['N'], label: 'Quick add a task' },
      { keys: ['Ctrl+K'], label: 'Quick add from anywhere' },
    ],
  },
  {
    title: 'Timer',
    rows: [
      { keys: ['Space'], label: 'Start, pause or carry on' },
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
    rows: [{ keys: ['?'], label: 'This list' }],
  },
]

export const QUICK_ADD_SYNTAX: ShortcutRow[] = [
  { keys: ['#Work'], label: 'Put it in the project starting with “Work”' },
  { keys: ['!'], label: 'Make it a Project (also “!!”)' },
  { keys: ['today'], label: 'Schedule for today (also “сьогодні”)' },
  { keys: ['tomorrow'], label: 'Schedule for tomorrow (also “завтра”)' },
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
  const { overlay, openQuickAdd, openShortcuts } = useHotkeyOverlay()

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
    const visible = actions.goals.value.filter(
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

  function onKeydown(event: KeyboardEvent) {
    if (!settings.behavior.keyboardShortcuts) return
    if (overlay.value !== 'none') return
    if (event.altKey) return
    if (document.querySelector('[aria-modal="true"]')) return

    const key = event.key.toLowerCase()

    if ((event.ctrlKey || event.metaKey) && key === 'k') {
      event.preventDefault()
      cancelGo()
      openQuickAdd()
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
