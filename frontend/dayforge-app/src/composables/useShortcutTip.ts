import { ref } from 'vue'
import { readJson, writeJson } from '../lib/storage'
import { getTodayISODate } from './goalSpace/date'
import { useSettings } from './useSettings'

const TIPS_STORAGE_KEY = 'dayforge-tips-v1'
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

interface TipState {
  shown: boolean
  firstSeen: string | null
}

const tipVisible = ref(false)

function loadState(): TipState {
  const stored = readJson<Partial<TipState>>(TIPS_STORAGE_KEY, {})
  return {
    shown: stored.shown === true,
    firstSeen: typeof stored.firstSeen === 'string' ? stored.firstSeen : null,
  }
}

function canShowTip(): boolean {
  if (!useSettings().settings.behavior.keyboardShortcuts) return false
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(FINE_POINTER_QUERY).matches
}

function showOnce() {
  const state = loadState()
  if (state.shown || !canShowTip()) return

  writeJson(TIPS_STORAGE_KEY, { ...state, shown: true })
  tipVisible.value = true
}

/** Called after a task is added through an inline composer, not quick add. */
export function noteManualTaskAdded() {
  showOnce()
}

export function useShortcutTip() {
  const state = loadState()
  const today = getTodayISODate()

  if (state.firstSeen === null) {
    writeJson(TIPS_STORAGE_KEY, { ...state, firstSeen: today })
  } else if (state.firstSeen !== today) {
    showOnce()
  }

  function dismissTip() {
    tipVisible.value = false
  }

  return { tipVisible, dismissTip }
}
