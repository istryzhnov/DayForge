import { ref, watch } from 'vue'

export type ThemeStyle = 'vivid' | 'minimal'
export type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'dayforge-theme-v1'

const themeStyle = ref<ThemeStyle>('vivid')
const themeMode = ref<ThemeMode>('dark')

let initialized = false

function isThemeStyle(value: unknown): value is ThemeStyle {
  return value === 'vivid' || value === 'minimal'
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

function applyThemeToDocument(style: ThemeStyle, mode: ThemeMode) {
  const root = document.documentElement
  root.dataset.themeStyle = style
  root.dataset.themeMode = mode
}

function initializeTheme() {
  if (initialized) return
  initialized = true

  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as {
        style?: ThemeStyle
        mode?: ThemeMode
      }

      if (isThemeStyle(parsed.style)) {
        themeStyle.value = parsed.style
      }

      if (isThemeMode(parsed.mode)) {
        themeMode.value = parsed.mode
      }
    }
  } catch {
    // Ignore malformed theme data and use defaults.
  }

  watch(
    [themeStyle, themeMode],
    ([nextStyle, nextMode]) => {
      applyThemeToDocument(nextStyle, nextMode)
      localStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ style: nextStyle, mode: nextMode }),
      )
    },
    { immediate: true },
  )
}

export function useTheme() {
  initializeTheme()

  return {
    themeStyle,
    themeMode,
    setThemeStyle: (nextStyle: ThemeStyle) => {
      themeStyle.value = nextStyle
    },
    setThemeMode: (nextMode: ThemeMode) => {
      themeMode.value = nextMode
    },
  }
}
