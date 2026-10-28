/** Compat checks: the day a view shows follows midnight, and a completion is read on the local day it fell on. */

import type { DailyTask } from '../../../src/entities/TaskEntity'
import type { ISODate } from '../../../src/entities/types'
import { TASK_STATUS } from '../../../src/entities/constants'
import { completedAfterItsOwnDay } from '../../../src/composables/goalSpace/dailyTasks'
import {
  instantToLocalISODate,
  toLocalISODate,
} from '../../../src/composables/goalSpace/date'
import { dayToShowAfterChange } from '../../../src/composables/goalSpace/today'
import { check, same, section } from './harness'

const TODAY = '2026-10-28' as ISODate

function doneAt(
  completedAt: string | undefined,
  status: string = TASK_STATUS.DONE,
) {
  return { id: 'row', status, completedAt } as unknown as DailyTask
}

export function verifyDayBoundaries() {
  section('day rollover: a view on the old today moves on, a picked day stays')

  check(
    'a view on the previous today moves to the new today',
    dayToShowAfterChange(
      '2026-10-27' as ISODate,
      '2026-10-27' as ISODate,
      TODAY,
    ) === TODAY,
  )
  check(
    'a day picked on purpose is left alone',
    dayToShowAfterChange(
      '2026-10-20' as ISODate,
      '2026-10-27' as ISODate,
      TODAY,
    ) === '2026-10-20',
  )

  section(
    'completion day: the local date of the stamp decides, not its UTC prefix',
  )

  // Kyiv in late October is UTC+2: 23:30 UTC on the 27th is already the 28th.
  check(
    'east of UTC: a tick just after local midnight counts as today',
    completedAfterItsOwnDay(doneAt('2026-10-27T23:30:00.000Z'), TODAY, 120) ===
      true,
  )
  check(
    'east of UTC: the local date is what is read',
    instantToLocalISODate('2026-10-27T23:30:00.000Z', 120) === '2026-10-28',
  )
  // New York is UTC-5: 00:30 UTC on the 28th is still the 27th locally.
  check(
    'west of UTC: a tick before local midnight stays on yesterday',
    completedAfterItsOwnDay(doneAt('2026-10-28T00:30:00.000Z'), TODAY, -300) ===
      false,
  )
  check(
    'a completion on an earlier local day is not counted as today',
    completedAfterItsOwnDay(doneAt('2026-10-27T10:00:00.000Z'), TODAY, 0) ===
      false,
  )
  check(
    'an open row or a missing or invalid stamp is never completed',
    completedAfterItsOwnDay(
      doneAt('2026-10-28T10:00:00.000Z', TASK_STATUS.TODO),
      TODAY,
      0,
    ) === false &&
      completedAfterItsOwnDay(doneAt(undefined), TODAY, 0) === false &&
      completedAfterItsOwnDay(doneAt('not-a-date'), TODAY, 0) === false,
  )
  check(
    'without an offset the device zone is used',
    same(
      instantToLocalISODate('2026-10-27T23:30:00.000Z'),
      toLocalISODate(new Date('2026-10-27T23:30:00.000Z')),
    ),
  )
}
