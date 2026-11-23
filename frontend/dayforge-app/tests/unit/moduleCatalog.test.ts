import { describe, expect, it } from 'vitest'
import {
  MODULE_ID,
  MODULE_IDS,
  MODULE_PRESETS,
  allModulesOn,
  isModuleOn,
  matchingPreset,
  presetModules,
  sanitizeModules,
} from '../../src/shared/composables/moduleCatalog'

describe('sanitizeModules', () => {
  it('turns every module on when the key is missing', () => {
    expect(sanitizeModules(undefined)).toEqual(allModulesOn())
    expect(sanitizeModules(null)).toEqual(allModulesOn())
    expect(sanitizeModules('nope')).toEqual(allModulesOn())
    expect(sanitizeModules([])).toEqual(allModulesOn())
  })

  it('lists all ten modules, all on by default', () => {
    expect(MODULE_IDS).toHaveLength(10)
    expect(Object.values(allModulesOn()).every(Boolean)).toBe(true)
  })

  it('keeps stored switches and fills in the ones it lacks as on', () => {
    const result = sanitizeModules({ timer: false, calendar: true })
    expect(result[MODULE_ID.TIMER]).toBe(false)
    expect(result[MODULE_ID.CALENDAR]).toBe(true)
    expect(result[MODULE_ID.NOTES]).toBe(true)
  })

  it('preserves unknown module ids written by a newer build', () => {
    const result = sanitizeModules({ futureThing: false, notes: false })
    expect(result.futureThing).toBe(false)
    expect(result[MODULE_ID.NOTES]).toBe(false)
  })

  it('drops values that are not booleans', () => {
    const result = sanitizeModules({ timer: 'off', habits: 0, weird: {} })
    expect(result[MODULE_ID.TIMER]).toBe(true)
    expect(result[MODULE_ID.HABITS]).toBe(true)
    expect(result).not.toHaveProperty('weird')
  })
})

describe('isModuleOn', () => {
  it('reads a switch, treating a missing one as on', () => {
    expect(isModuleOn({ timer: false }, 'timer')).toBe(false)
    expect(isModuleOn({}, 'timer')).toBe(true)
  })

  it('needs earnings on for clients', () => {
    const earningsOff = { ...allModulesOn(), earnings: false }
    expect(isModuleOn(earningsOff, MODULE_ID.CLIENTS)).toBe(false)
    expect(isModuleOn(allModulesOn(), MODULE_ID.CLIENTS)).toBe(true)
  })
})

describe('presets', () => {
  it('simple turns everything off', () => {
    const simple = MODULE_PRESETS.find((preset) => preset.id === 'simple')
    expect(simple).toBeDefined()
    expect(Object.values(presetModules(simple!)).some(Boolean)).toBe(false)
  })

  it('a preset matches itself and nothing else exactly', () => {
    MODULE_PRESETS.forEach((preset) => {
      expect(matchingPreset(presetModules(preset))).toBe(preset.id)
    })
    expect(matchingPreset(allModulesOn())).toBeNull()
  })
})
