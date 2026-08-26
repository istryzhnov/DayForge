import { computed } from 'vue'
import { useTheme } from '../../../composables/useTheme'
import {
  COLOR_TOKENS,
  type ColorTokenMeta,
} from '../../../composables/theme/tokens'
import {
  contrastReport,
  suggestionsFor,
} from '../../../composables/theme/suggestions'

const GROUPS: { id: ColorTokenMeta['group']; label: string; hint: string }[] = [
  {
    id: 'primary',
    label: 'Main colours',
    hint: 'What tasks, projects and actions are painted with.',
  },
  {
    id: 'surface',
    label: 'Surfaces',
    hint: 'The canvas, the cards on it and the frames around them.',
  },
  {
    id: 'secondary',
    label: 'Text and alerts',
    hint: 'Everything that has to stay readable on those surfaces.',
  },
]

export function useColorTokenGroups() {
  const {
    themeMode,
    palette,
    effectivePalette,
    setColor,
    resetColor,
    resetPalette,
  } = useTheme()

  const groups = computed(() =>
    GROUPS.map((group) => ({
      ...group,
      tokens: COLOR_TOKENS.filter((token) => token.group === group.id).map(
        (token) => {
          const value = effectivePalette.value[token.key]
          const report =
            group.id === 'surface'
              ? null
              : contrastReport(value, effectivePalette.value.panel)

          return {
            ...token,
            value,
            isCustom: palette.value[token.key] !== undefined,
            suggestions: suggestionsFor(
              token.key,
              effectivePalette.value,
              themeMode.value,
            ),
            contrastMessage: report?.message,
            contrastLevel: report?.level,
          }
        },
      ),
    })),
  )

  return { groups, setColor, resetColor, resetPalette }
}
