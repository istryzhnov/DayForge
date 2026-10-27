import { ref, watch } from 'vue'

export const ANALYTICS_TAB = {
  TIME: 'time',
  MONEY: 'money',
  HABITS: 'habits',
} as const

export type AnalyticsTab = (typeof ANALYTICS_TAB)[keyof typeof ANALYTICS_TAB]

const TAB_STORAGE_KEY = 'dayforge-analytics-tab'
const TABS: string[] = Object.values(ANALYTICS_TAB)

function readStoredTab(): AnalyticsTab {
  try {
    const stored = localStorage.getItem(TAB_STORAGE_KEY)
    if (stored && TABS.includes(stored)) return stored as AnalyticsTab
  } catch {
    // Storage can be blocked (private windows); the default tab still works.
  }
  return ANALYTICS_TAB.TIME
}

function storeTab(tab: AnalyticsTab) {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab)
  } catch {
    // Not remembering the tab is harmless.
  }
}

/** The tab this viewer last opened, kept in this browser only. */
export function useAnalyticsTab() {
  const tab = ref<AnalyticsTab>(readStoredTab())
  watch(tab, storeTab)
  return tab
}
