import { describe, expect, it } from 'vitest'
import {
  nextReminderChoice,
  normalizeReminderMinutes,
  REMINDER_CHOICE_CYCLE,
  reminderChoiceOf,
  reminderLeadMs,
  reminderMinutesOf,
  type ReminderChoice,
} from '../../src/shared/composables/goalSpace/reminder'

const GLOBAL_MS = 10 * 60 * 1000

describe('normalizeReminderMinutes', () => {
  it('keeps null and whole minute values', () => {
    expect(normalizeReminderMinutes(null)).toBeNull()
    expect(normalizeReminderMinutes(30)).toBe(30)
    expect(normalizeReminderMinutes(0)).toBe(0)
    expect(normalizeReminderMinutes(14.6)).toBe(15)
  })

  it('treats old data without the field, and bad values, as absent', () => {
    expect(normalizeReminderMinutes(undefined)).toBeUndefined()
    expect(normalizeReminderMinutes('30')).toBeUndefined()
    expect(normalizeReminderMinutes(-5)).toBeUndefined()
    expect(normalizeReminderMinutes(NaN)).toBeUndefined()
    expect(normalizeReminderMinutes(100000)).toBeUndefined()
  })
})

describe('reminderLeadMs', () => {
  it('uses the global lead when the task has none', () => {
    expect(reminderLeadMs(undefined, GLOBAL_MS)).toBe(GLOBAL_MS)
  })

  it('skips the task when its reminder is off', () => {
    expect(reminderLeadMs(null, GLOBAL_MS)).toBeNull()
  })

  it('uses the task own lead in ms', () => {
    expect(reminderLeadMs(30, GLOBAL_MS)).toBe(30 * 60 * 1000)
    expect(reminderLeadMs(0, GLOBAL_MS)).toBe(0)
  })
})

describe('reminder choices', () => {
  it('maps old data to the default choice and back', () => {
    expect(reminderChoiceOf(undefined)).toBe('default')
    expect(reminderChoiceOf(null)).toBeNull()
    expect(reminderChoiceOf(30)).toBe(30)
    expect(reminderMinutesOf('default')).toBeUndefined()
    expect(reminderMinutesOf(null)).toBeNull()
    expect(reminderMinutesOf(15)).toBe(15)
  })

  it('cycles through every option and wraps round', () => {
    let choice: ReminderChoice = 'default'
    const seen: ReminderChoice[] = []
    for (let step = 0; step < REMINDER_CHOICE_CYCLE.length; step += 1) {
      seen.push(choice)
      choice = nextReminderChoice(choice)
    }
    expect(seen).toEqual(['default', 5, 10, 15, 30, 60, null])
    expect(choice).toBe('default')
  })
})
