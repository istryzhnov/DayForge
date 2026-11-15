/**
 * The tour hears what the user did through the user-action bus, never through
 * a direct call. These tests drive the real timer and hotkeys and watch the
 * tour move, so a missing or doubled subscription shows up here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const stops: Array<() => void> = []

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-09-02T10:00:00') })
  localStorage.clear()
  // Fresh singletons for every test: the tour, the timer and the bus.
  vi.resetModules()
})

afterEach(() => {
  stops.splice(0).forEach((stop) => stop())
  vi.useRealTimers()
})

async function openApp() {
  const { effectScope } = await import('vue')
  const { useTour } =
    await import('../../src/features/onboarding/composables/useTour')
  const { reportUserAction } =
    await import('../../src/shared/composables/userActions')
  const scope = effectScope()
  stops.push(() => scope.stop())
  const tour = scope.run(() => useTour())!
  const step = () => tour.state.value?.step ?? null
  return { scope, tour, step, reportUserAction }
}

describe('tour wiring', () => {
  it('moves on when the timer starts and stops a sitting', async () => {
    const { scope, tour, step, reportUserAction } = await openApp()
    const { useTimer } = await import('../../src/shared/composables/useTimer')
    const timer = scope.run(() => useTimer())!

    tour.startChapter('timer')
    expect(step()).toBe('timer-open')

    reportUserAction('view-opened', { view: 'timer' })
    expect(step()).toBe('timer-start')

    timer.start()
    expect(step()).toBe('timer-stop')

    timer.stop()
    expect(step()).toBe('timer-mode')
  })

  it('moves on when quick add is opened with the keyboard', async () => {
    const { scope, tour, step } = await openApp()
    const { useHotkeyOverlay } =
      await import('../../src/shared/composables/useHotkeys')
    const hotkeys = scope.run(() => useHotkeyOverlay())!

    tour.startChapter('shortcuts')
    expect(step()).toBe('short-quick-key')

    hotkeys.openQuickAdd()
    expect(step()).not.toBe('short-quick-key')
  })

  it('moves exactly one step per action', async () => {
    const { tour, step, reportUserAction } = await openApp()
    tour.startChapter('timer')

    reportUserAction('view-opened', { view: 'timer' })

    expect(tour.stepNumber.value).toBe(2)
    expect(step()).toBe('timer-start')
  })

  it('ignores actions the current step does not wait for', async () => {
    const { tour, step, reportUserAction } = await openApp()
    tour.startChapter('timer')

    reportUserAction('help-opened')
    reportUserAction('view-opened', { view: 'calendar' })

    expect(step()).toBe('timer-open')
  })

  it('does nothing while no tour is running', async () => {
    const { tour, reportUserAction } = await openApp()

    reportUserAction('timer-started')
    reportUserAction('view-opened', { view: 'timer' })

    expect(tour.running.value).toBe(false)
    expect(tour.state.value).toBeNull()
  })

  it('stops moving once the tour is skipped', async () => {
    const { tour, step, reportUserAction } = await openApp()
    tour.startChapter('timer')
    tour.skip()

    reportUserAction('view-opened', { view: 'timer' })

    expect(tour.running.value).toBe(false)
    expect(step()).toBe('timer-open')
  })

  it('keeps the tour advancing when a listener before it throws', async () => {
    // Subscribe the broken listener first, so it runs before the tour does.
    const { onUserAction } =
      await import('../../src/shared/composables/userActions')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stops.push(
      onUserAction(() => {
        throw new Error('broken listener')
      }),
    )
    const { tour, step, reportUserAction } = await openApp()
    tour.startChapter('timer')

    reportUserAction('view-opened', { view: 'timer' })

    expect(console.error).toHaveBeenCalledOnce()
    expect(step()).toBe('timer-start')
  })

  it('subscribes the tour to the bus exactly once', async () => {
    const actual = await vi.importActual<
      typeof import('../../src/shared/composables/userActions')
    >('../../src/shared/composables/userActions')
    const subscribe = vi.fn(actual.onUserAction)
    vi.doMock('../../src/shared/composables/userActions', () => ({
      ...actual,
      onUserAction: subscribe,
    }))

    await import('../../src/features/onboarding/composables/useTour')
    await import('../../src/features/onboarding/composables/useTour')

    expect(subscribe).toHaveBeenCalledOnce()
    vi.doUnmock('../../src/shared/composables/userActions')
  })
})
