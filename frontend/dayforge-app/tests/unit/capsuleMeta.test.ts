import { describe, expect, it } from 'vitest'
import { capsuleMeta } from '../../src/features/sidebar/composables/liveTimerMeta'

describe('capsuleMeta', () => {
  it('joins project, rate and earned with a middle dot, as in the mockup', () => {
    expect(
      capsuleMeta({
        projectName: 'DayForge',
        rateLabel: '$45 / h',
        earnedLabel: '+$31.70',
      }),
    ).toBe('DayForge · $45 / h · +$31.70')
  })

  it('omits the project part without a project, and the money without a rate', () => {
    expect(capsuleMeta({ rateLabel: '$45 / h', earnedLabel: '+$1.00' })).toBe(
      '$45 / h · +$1.00',
    )
    expect(capsuleMeta({ projectName: 'DayForge' })).toBe('DayForge')
    expect(capsuleMeta({})).toBe('')
  })
})
