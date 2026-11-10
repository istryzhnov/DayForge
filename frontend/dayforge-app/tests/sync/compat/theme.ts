/** Compat checks: primary button contrast in every preset, and reset going back to the chosen palette. */

import {
  contrastRatio,
  mix,
  PRIMARY_BUTTON_SHADE,
  readableButtonTextOn,
} from '../../../src/composables/theme/color'
import {
  PALETTE_PRESETS,
  presetBaseColors,
  presetColorsFor,
  presetIdFor,
  samePalette,
  type ThemeMode,
} from '../../../src/composables/theme/tokens'
import { check, same, section } from './harness'

/** Variants with no colours of their own use the stylesheet's values (layout.css). */
const DESIGNED_BUTTONS: Record<ThemeMode, { accent: string; ink: string }> = {
  dark: { accent: '#73ff44', ink: '#0f190c' },
  light: { accent: '#34b531', ink: '#071907' },
}

const MODES: ThemeMode[] = ['dark', 'light']

export function verifyPrimaryButtonContrast() {
  section('Primary button text in every preset')

  for (const preset of PALETTE_PRESETS)
    for (const mode of MODES) {
      const colors = presetColorsFor(preset, mode)
      const designed =
        Object.keys(colors).length === 0 ? DESIGNED_BUTTONS[mode] : undefined
      const accent = colors.accent ?? designed?.accent
      const ink = designed ? designed.ink : readableButtonTextOn(accent ?? '')
      const name = `${preset.id} (${mode})`
      if (!accent) {
        check(`${name} has an accent`, false)
        continue
      }
      const shade = mix(accent, '#000000', PRIMARY_BUTTON_SHADE)
      const worst = Math.min(
        contrastRatio(ink, accent),
        contrastRatio(ink, shade),
      )
      check(
        `${name} button text clears 4.5:1 on both gradient ends (${worst.toFixed(2)}:1)`,
        worst >= 4.5,
      )
    }
}

export function verifyPresetReset() {
  section('Reset colours goes back to the chosen preset')

  check(
    'Sunset resets to its own colours in dark vivid',
    same(
      presetBaseColors('sunset', 'vivid', 'dark'),
      PALETTE_PRESETS.find((p) => p.id === 'sunset')?.colors,
    ),
  )
  check(
    'Grape resets to its own colours in minimal dark',
    same(
      presetBaseColors('grape', 'minimal', 'dark'),
      PALETTE_PRESETS.find((p) => p.id === 'grape')?.colors,
    ),
  )
  check(
    'in day mode, Sunset resets to its day variant',
    same(
      presetBaseColors('sunset', 'vivid', 'light'),
      PALETTE_PRESETS.find((p) => p.id === 'sunset')?.twin,
    ),
  )
  check(
    'a style that no longer fits the palette falls back to designed values',
    same(presetBaseColors('sunset', 'minimal', 'dark'), {}),
  )
  check(
    'no remembered preset falls back to designed values',
    same(presetBaseColors(null, 'vivid', 'dark'), {}),
  )
  check(
    'an unknown preset id falls back to designed values',
    same(presetBaseColors('nope', 'vivid', 'dark'), {}),
  )
}

export function verifyPresetMemory() {
  section('Remembered preset in a stored theme')

  const sunset = PALETTE_PRESETS.find((p) => p.id === 'sunset')?.colors ?? {}

  check(
    'a stored preset id is kept',
    presetIdFor('grape', 'minimal', 'dark', {}) === 'grape',
  )
  check(
    'an old theme without an id matches its preset by value',
    presetIdFor(undefined, 'vivid', 'dark', { ...sunset }) === 'sunset',
  )
  check(
    'a custom theme without an id has no preset',
    presetIdFor(undefined, 'vivid', 'dark', { accent: '#123456' }) === null,
  )
  check(
    'an unknown stored id with no value match has no preset',
    presetIdFor('nope', 'vivid', 'dark', { accent: '#123456' }) === null,
  )
  check(
    'the old Daylight theme is Forge in day mode',
    presetIdFor('daylight', 'vivid', 'light', {}) === 'forge',
  )
  check(
    'a day variant is matched by value',
    presetIdFor(
      undefined,
      'vivid',
      'light',
      PALETTE_PRESETS.find((p) => p.id === 'sunset')?.twin ?? {},
    ) === 'sunset',
  )
  for (const preset of PALETTE_PRESETS) {
    const other: ThemeMode = preset.mode === 'dark' ? 'light' : 'dark'
    const twin = presetColorsFor(preset, other)
    check(
      `${preset.id} has a ${other} variant with its own canvas, or the designed one`,
      Object.keys(twin).length === 0
        ? Object.keys(preset.colors).length === 0
        : twin.bg !== undefined && twin.bg !== preset.colors.bg,
    )
  }
  check(
    'palettes match regardless of key order',
    samePalette(
      { accent: '#ffb347', bg: '#150f1b' },
      { bg: '#150f1b', accent: '#ffb347' },
    ),
  )
}
