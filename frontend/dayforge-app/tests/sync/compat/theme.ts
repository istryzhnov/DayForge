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
  presetIdFor,
  samePalette,
} from '../../../src/composables/theme/tokens'
import { check, same, section } from './harness'

/** Presets with no colours of their own use the stylesheet's values (layout.css). */
const DESIGNED_BUTTONS: Record<string, { accent: string; ink: string }> = {
  forge: { accent: '#73ff44', ink: '#0f190c' },
  daylight: { accent: '#34b531', ink: '#071907' },
}

export function verifyPrimaryButtonContrast() {
  section('Primary button text in every preset')

  for (const preset of PALETTE_PRESETS) {
    const designed = DESIGNED_BUTTONS[preset.id]
    const accent = preset.colors.accent ?? designed?.accent
    const ink = designed ? designed.ink : readableButtonTextOn(accent ?? '')
    if (!accent) {
      check(`${preset.id} has an accent`, false)
      continue
    }
    const shade = mix(accent, '#000000', PRIMARY_BUTTON_SHADE)
    const worst = Math.min(
      contrastRatio(ink, accent),
      contrastRatio(ink, shade),
    )
    check(
      `${preset.id} button text clears 4.5:1 on both gradient ends (${worst.toFixed(2)}:1)`,
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
    'after switching mode away from Sunset, reset falls back to designed values',
    same(presetBaseColors('sunset', 'vivid', 'light'), {}),
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
    'palettes match regardless of key order',
    samePalette(
      { accent: '#ffb347', bg: '#150f1b' },
      { bg: '#150f1b', accent: '#ffb347' },
    ),
  )
}
