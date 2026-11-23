import { describe, expect, it } from 'vitest'
import { buildWave } from '../../src/features/analytics/composables/charts'

describe('buildWave', () => {
  it('draws nothing without points', () => {
    expect(buildWave([], 100)).toEqual({ line: '', area: '', end: null })
  })

  it('ends on the last point and closes the area down to the baseline', () => {
    const wave = buildWave(
      [
        { x: 0, y: 80 },
        { x: 10, y: 20 },
        { x: 20, y: 60 },
      ],
      100,
    )
    expect(wave.line.startsWith('M0 80')).toBe(true)
    expect(wave.line.endsWith('20 60')).toBe(true)
    expect(wave.area.endsWith('L20 100 L0 100 Z')).toBe(true)
    expect(wave.end).toEqual({ x: 20, y: 60 })
  })

  it('never lets the curve dip below the baseline', () => {
    const baseline = 100
    const wave = buildWave(
      [
        { x: 0, y: 10 },
        { x: 10, y: 100 },
        { x: 20, y: 10 },
        { x: 30, y: 100 },
      ],
      baseline,
    )
    const ys = [...wave.line.matchAll(/-?\d+(?:\.\d+)?/g)]
      .map((match) => Number(match[0]))
      .filter((_, index) => index % 2 === 1)
    expect(Math.max(...ys)).toBeLessThanOrEqual(baseline)
  })

  it('still gives a single point a drawable line', () => {
    const wave = buildWave([{ x: 5, y: 50 }], 100)
    expect(wave.line).toMatch(/^M5 50 H/)
    expect(wave.end).toEqual({ x: 5, y: 50 })
  })
})
