import { computed } from 'vue'
import { i18n } from '../../../i18n'
import { useTheme } from '../../../composables/useTheme'
import {
  COLOR_TOKENS,
  type ColorTokenMeta,
} from '../../../composables/theme/tokens'
import {
  contrastReport,
  suggestionsFor,
} from '../../../composables/theme/suggestions'

/** Group titles and hints are message keys, translated where the groups render. */
const GROUPS: {
  id: ColorTokenMeta['group']
  labelKey: string
  hintKey: string
}[] = [
  {
    id: 'primary',
    labelKey: 'settings.groupMainColours',
    hintKey: 'settings.groupMainColoursHint',
  },
  {
    id: 'surface',
    labelKey: 'settings.groupSurfaces',
    hintKey: 'settings.groupSurfacesHint',
  },
  {
    id: 'secondary',
    labelKey: 'settings.groupTextAlerts',
    hintKey: 'settings.groupTextAlertsHint',
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
            contrastMessage: report
              ? i18n.global.t(report.messageKey, { ratio: report.ratio })
              : undefined,
            contrastLevel: report?.level,
          }
        },
      ),
    })),
  )

  return { groups, setColor, resetColor, resetPalette }
}
