import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  onUserAction,
  reportUserAction,
  type UserActionListener,
} from '../../src/shared/composables/userActions'

const stops: Array<() => void> = []
function listen(listener: UserActionListener) {
  stops.push(onUserAction(listener))
}

afterEach(() => {
  stops.splice(0).forEach((stop) => stop())
  vi.restoreAllMocks()
})

describe('user actions', () => {
  it('delivers the action and its payload to every listener, in subscribe order', () => {
    const heard: string[] = []
    listen((action, payload) => heard.push(`a:${action}:${payload.taskId}`))
    listen((action, payload) => heard.push(`b:${action}:${payload.taskId}`))

    reportUserAction('timer-started', { taskId: 't1' })

    expect(heard).toEqual(['a:timer-started:t1', 'b:timer-started:t1'])
  })

  it('passes an empty payload when none is given', () => {
    const listener = vi.fn()
    listen(listener)

    reportUserAction('help-opened')

    expect(listener).toHaveBeenCalledWith('help-opened', {})
  })

  it('delivers synchronously, before the caller goes on', () => {
    let heard = false
    listen(() => {
      heard = true
    })

    reportUserAction('search-opened')

    expect(heard).toBe(true)
  })

  it('stops delivering once the listener unsubscribes', () => {
    const listener = vi.fn()
    const stop = onUserAction(listener)

    reportUserAction('task-done')
    stop()
    reportUserAction('task-done')

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('treats a second stop as a no-op', () => {
    const listener = vi.fn()
    const stop = onUserAction(listener)
    stop()
    stop()

    reportUserAction('task-done')

    expect(listener).not.toHaveBeenCalled()
  })

  it('keeps the other listeners and the caller going when one throws', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const after = vi.fn()
    listen(() => {
      throw new Error('broken listener')
    })
    listen(after)

    expect(() => reportUserAction('timer-stopped')).not.toThrow()
    expect(after).toHaveBeenCalledWith('timer-stopped', {})
    expect(error).toHaveBeenCalledOnce()
  })

  it('still reaches every listener when one unsubscribes while being called', () => {
    const second = vi.fn()
    const stopFirst = onUserAction(() => stopFirst())
    stops.push(stopFirst)
    listen(second)

    reportUserAction('view-opened', { view: 'timer' })
    reportUserAction('view-opened', { view: 'timer' })

    expect(second).toHaveBeenCalledTimes(2)
  })
})
