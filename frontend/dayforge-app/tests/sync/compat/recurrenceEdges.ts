/** Compat checks: month-end recurrence. A rule day a month does not have falls on that month's last day. */

import type { RecurrenceRule } from '../../../src/entities/RecurrenceEntity'
import type { ISODate } from '../../../src/entities/types'
import { RECURRENCE_TYPE } from '../../../src/entities/constants'
import {
  matchesRecurrence,
  nextPlannedDateOf,
} from '../../../src/composables/goalSpace/recurrence'
import type { TaskTemplate } from '../../../src/entities/TaskEntity'
import { check, section } from './harness'

const on = (rule: RecurrenceRule, date: string) =>
  matchesRecurrence(rule, date as ISODate)

export function verifyRecurrenceEdges() {
  section('monthly: days 29 to 31 fall on the last day of a shorter month')

  const thirtyFirst: RecurrenceRule = {
    type: RECURRENCE_TYPE.MONTHLY,
    daysOfMonth: [31],
    startDate: '2026-01-31' as ISODate,
  }
  check('the 31st matches a 31-day month', on(thirtyFirst, '2026-03-31'))
  check('the 31st clamps to 30 April', on(thirtyFirst, '2026-04-30'))
  check('the 31st clamps to 28 February', on(thirtyFirst, '2026-02-28'))
  check(
    'the 29th does not match 28 February of a short month too early',
    !on(thirtyFirst, '2026-02-27'),
  )
  check(
    'a 31 rule does not fire on the 29th of April',
    !on(thirtyFirst, '2026-04-29'),
  )

  const thirtieth: RecurrenceRule = {
    type: RECURRENCE_TYPE.MONTHLY,
    daysOfMonth: [30],
    startDate: '2026-01-30' as ISODate,
  }
  check('a 30 rule clamps to 28 February', on(thirtieth, '2026-02-28'))
  check('a 30 rule still fires on the 30th', on(thirtieth, '2026-09-30'))

  const twentyNinth: RecurrenceRule = {
    type: RECURRENCE_TYPE.MONTHLY,
    daysOfMonth: [29],
    startDate: '2026-01-29' as ISODate,
  }
  check(
    'a 29 rule falls on 29 February of a leap year',
    on(twentyNinth, '2028-02-29'),
  )
  check(
    'a 29 rule clamps to 28 February of a common year',
    on(twentyNinth, '2027-02-28'),
  )
  check(
    'a 29 rule does not fire on 28 February of a leap year',
    !on(twentyNinth, '2028-02-28'),
  )

  section('yearly: 29 February falls on 28 February in a common year')

  const leapDay: RecurrenceRule = {
    type: RECURRENCE_TYPE.YEARLY,
    startDate: '2024-02-29' as ISODate,
  }
  check('29 February matches in a leap year', on(leapDay, '2028-02-29'))
  check('it falls on 28 February in a common year', on(leapDay, '2027-02-28'))
  check('not on 28 February of a leap year', !on(leapDay, '2028-02-28'))
  check('not on 1 March of a common year', !on(leapDay, '2027-03-01'))

  const september: RecurrenceRule = {
    type: RECURRENCE_TYPE.YEARLY,
    startDate: '2026-09-15' as ISODate,
  }
  check(
    'an ordinary yearly date is unchanged',
    on(september, '2027-09-15') && !on(september, '2027-09-14'),
  )
  section(
    'next planned date: 29 February falls on 28 February in a common year',
  )

  const leapTemplate = {
    id: 'leap',
    title: 'Leap',
    priority: 'minor',
    order: 0,
    tagIds: [],
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    recurrence: { type: RECURRENCE_TYPE.YEARLY, startDate: '2024-02-29' },
  } as unknown as TaskTemplate
  check(
    'in a common year it is shown on 28 February',
    nextPlannedDateOf(leapTemplate, '2027-01-10' as ISODate) === '2027-02-28',
  )
  check(
    'after 28 February of a common year the next one is a leap year',
    nextPlannedDateOf(leapTemplate, '2027-03-01' as ISODate) === '2028-02-29',
  )
  check(
    'on 29 February of a leap year it is that day',
    nextPlannedDateOf(leapTemplate, '2028-02-29' as ISODate) === '2028-02-29',
  )
}
