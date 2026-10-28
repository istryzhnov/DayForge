/** Compat checks: goals, task templates and settings merge a field group at a time. */

import { SYNC_TABLE, type SyncedRow } from '../../../src/sync/types'
import {
  mergeCollection,
  mergeRow,
  groupNamesOf,
} from '../../../src/sync/merge'
import {
  GOAL_FIELD_GROUPS,
  stampChangedGroups,
  stampOfGroup,
} from '../../../src/sync/fieldGroups'
import { restampForRestore } from '../../../src/sync/tombstoneRules'
import { check, clone, FUTURE, goalRow, section, same, T0 } from './harness'

/** Minute-resolution stamps, so the cases read in order. */
const at = (minute: number) =>
  `2026-09-01T10:${String(minute).padStart(2, '0')}:00.000Z`

const templateRow = (overrides: Record<string, unknown> = {}): SyncedRow =>
  ({
    id: 'task-a',
    goalId: 'goal-a',
    title: 'Read',
    priority: 'minor',
    order: 0,
    tagIds: [],
    isActive: true,
    startTime: '08:00',
    endTime: '09:00',
    createdAt: T0,
    updatedAt: at(1),
    ...FUTURE,
    ...overrides,
  }) as SyncedRow

/** A row that carries a stamp for every group, all at one moment. */
function everyGroupAt(
  moment: string,
  groups: string[],
  overrides: Record<string, string> = {},
): Record<string, string> {
  const stamps: Record<string, string> = {}
  groups.forEach((group) => {
    stamps[group] = moment
  })
  return { ...stamps, ...overrides }
}

const GOAL_GROUPS = Object.keys(GOAL_FIELD_GROUPS)
const TEMPLATE_GROUPS = [
  'text',
  'schedule',
  'structure',
  'board',
  'order',
  'money',
]
const SECTIONS = [
  'notifications',
  'calendar',
  'behavior',
  'format',
  'timer',
  'goals',
  'billing',
]

function settingsRow(
  values: Record<string, unknown>,
  stamps: Record<string, string>,
  updatedAt: string,
): SyncedRow {
  const sections = Object.fromEntries(
    SECTIONS.map((section) => [section, { on: false }]),
  )
  return {
    id: 'settings',
    ...sections,
    ...values,
    fieldsAt: stamps,
    updatedAt,
  } as SyncedRow
}

export function verifyFieldGroupMerge() {
  section('Goals: two groups edited on two devices both survive')

  const sharedStamps = everyGroupAt(at(1), GOAL_GROUPS)
  const base = goalRow({
    title: 'Work',
    accentColor: '#111111',
    createdAt: T0,
    updatedAt: at(1),
    fieldsAt: sharedStamps,
  })
  const renamed = clone({
    ...base,
    title: 'Client work',
    updatedAt: at(5),
    fieldsAt: { ...sharedStamps, details: at(5) },
  })
  const recoloured = clone({
    ...base,
    accentColor: '#ff7a2f',
    updatedAt: at(6),
    fieldsAt: { ...sharedStamps, look: at(6) },
  })

  const both = mergeRow(SYNC_TABLE.GOALS, renamed, recoloured)
  check(
    'title from one device and colour from the other both survive',
    both.row.title === 'Client work' && both.row.accentColor === '#ff7a2f',
    both.row,
  )
  check(
    'the merged goal is stamped at the newer of its groups',
    both.row.updatedAt === at(6),
  )
  check('the merge is recorded as a merge', both.outcome === 'merged')
  check(
    'merging the other way round gives the same goal',
    same(mergeRow(SYNC_TABLE.GOALS, recoloured, renamed).row, both.row),
  )

  section('Goals: the same group edited twice is decided by time')

  const earlierName = clone({
    ...base,
    title: 'Old name',
    updatedAt: at(4),
    fieldsAt: { ...sharedStamps, details: at(4) },
  })
  const laterName = clone({
    ...base,
    title: 'New name',
    updatedAt: at(7),
    fieldsAt: { ...sharedStamps, details: at(7) },
  })
  check(
    'the later edit of a group wins it',
    mergeRow(SYNC_TABLE.GOALS, earlierName, laterName).row.title ===
      'New name' &&
      mergeRow(SYNC_TABLE.GOALS, laterName, earlierName).row.title ===
        'New name',
  )

  section('Task templates: title and schedule edited apart both survive')

  const templateStamps = everyGroupAt(at(1), TEMPLATE_GROUPS)
  const renamedTemplate = templateRow({
    title: 'Read a book',
    updatedAt: at(5),
    fieldsAt: { ...templateStamps, text: at(5) },
  })
  const rescheduled = templateRow({
    startTime: '10:00',
    endTime: '11:00',
    updatedAt: at(6),
    fieldsAt: { ...templateStamps, schedule: at(6) },
  })
  const bothTemplate = mergeRow(
    SYNC_TABLE.TASK_TEMPLATES,
    renamedTemplate,
    rescheduled,
  ).row
  check(
    'the new title and the new schedule are both kept',
    bothTemplate.title === 'Read a book' &&
      bothTemplate.startTime === '10:00' &&
      bothTemplate.endTime === '11:00',
    bothTemplate,
  )

  section('Legacy rows without group stamps')

  const legacyOld = goalRow({ id: 'g-legacy', title: 'Old', updatedAt: at(2) })
  const newStamped = goalRow({
    id: 'g-legacy',
    title: 'New',
    accentColor: '#00ff00',
    updatedAt: at(3),
    fieldsAt: everyGroupAt(at(3), GOAL_GROUPS),
  })
  const newWins = mergeRow(SYNC_TABLE.GOALS, legacyOld, newStamped).row
  check(
    'a stamped row beats an older legacy row in every group',
    newWins.title === 'New' && newWins.accentColor === '#00ff00',
  )
  check(
    'a legacy row is not sent back over a newer stamped one',
    mergeRow(SYNC_TABLE.GOALS, legacyOld, newStamped).outcome !== 'local',
  )

  const legacyNewer = goalRow({
    id: 'g-legacy',
    title: 'Legacy later',
    updatedAt: at(4),
  })
  check(
    'a legacy whole-row write counts as every group at its stamp',
    mergeRow(SYNC_TABLE.GOALS, newStamped, legacyNewer).row.title ===
      'Legacy later',
  )

  const templateNewer = templateRow({
    title: 'Legacy title',
    startTime: '08:00',
    updatedAt: at(6),
  })
  const templateStamped = templateRow({
    title: 'Old title',
    startTime: '12:00',
    updatedAt: at(5),
    fieldsAt: everyGroupAt(at(5), TEMPLATE_GROUPS),
  })
  check(
    'a legacy template newer than a group wins that group',
    mergeRow(SYNC_TABLE.TASK_TEMPLATES, templateStamped, templateNewer).row
      .startTime === '08:00',
  )

  const stale = goalRow({
    id: 'g-stale',
    title: 'Written by an older build',
    updatedAt: at(9),
    fieldsAt: { details: at(1) },
  })
  check(
    'a row whose stamp is newer than its groups counts for every group',
    stampOfGroup(stale, 'look') === at(9) &&
      stampOfGroup(stale, 'details') === at(9),
  )

  section('Tombstones compare a deletion with the newest group')

  const groupedAt3 = goalRow({
    id: 'g-del',
    title: 'Gone',
    updatedAt: at(3),
    fieldsAt: everyGroupAt(at(3), GOAL_GROUPS),
  })
  const deletedLater = mergeCollection(
    SYNC_TABLE.GOALS,
    [groupedAt3],
    [clone(groupedAt3)],
    new Map([[`${SYNC_TABLE.GOALS}\u0000g-del`, at(4)]]),
  )
  check(
    'a deletion newer than every group wins',
    deletedLater.merged.length === 0 && deletedLater.toDelete.includes('g-del'),
  )

  const editedAfterDelete = goalRow({
    id: 'g-revive',
    title: 'Edited later',
    updatedAt: at(5),
    fieldsAt: { ...everyGroupAt(at(1), GOAL_GROUPS), details: at(5) },
  })
  const revived = mergeCollection(
    SYNC_TABLE.GOALS,
    [clone(editedAfterDelete)],
    [clone(editedAfterDelete)],
    new Map([[`${SYNC_TABLE.GOALS}\u0000g-revive`, at(3)]]),
  )
  check(
    'a deletion older than one group edit revives the row',
    revived.merged.length === 1 &&
      revived.merged[0].title === 'Edited later' &&
      !revived.toDelete.includes('g-revive'),
  )

  section('Stamping an edit marks only the groups it changed')

  const previous = goalRow({ title: 'Work', updatedAt: at(1) })
  const edited = clone(previous)
  edited.title = 'Renamed'
  check(
    'a rename stamps the details group',
    stampChangedGroups(previous, edited, GOAL_FIELD_GROUPS, at(9)) &&
      (edited.fieldsAt as Record<string, string>).details === at(9),
  )
  check(
    'the other groups keep the stamp they had',
    (edited.fieldsAt as Record<string, string>).look === at(1) &&
      edited.updatedAt === at(9),
  )

  // A stamp moved with no field changed must not claim every group: the old
  // stamp goes back, so another device's edit to a group is not overwritten.
  const bumped = clone(previous)
  bumped.updatedAt = at(9)
  check(
    'a stamp moved without an edit is put back',
    stampChangedGroups(previous, bumped, GOAL_FIELD_GROUPS, at(9)) &&
      bumped.updatedAt === at(1) &&
      bumped.fieldsAt === undefined,
  )

  const fresh = goalRow({ id: 'g-new', title: 'Brand new' })
  check(
    'a new row is stamped in every group',
    stampChangedGroups(undefined, fresh, GOAL_FIELD_GROUPS, at(9)) &&
      GOAL_GROUPS.every(
        (group) =>
          (fresh.fieldsAt as Record<string, string> | undefined)?.[group] ===
          at(9),
      ),
  )

  const withField = clone(previous)
  withField.futureField = 'changed'
  check(
    'a field outside every group is stamped under its own name',
    stampChangedGroups(previous, withField, GOAL_FIELD_GROUPS, at(9)) &&
      (withField.fieldsAt as Record<string, string>).futureField === at(9),
  )

  section('Unknown fields and sections are carried along')

  const newerBuild = goalRow({
    id: 'g-future',
    title: 'Known',
    updatedAt: at(6),
    fieldsAt: { ...everyGroupAt(at(1), GOAL_GROUPS), 'brand-new': at(6) },
    newField: 'from the newer build',
  })
  const olderBuild = goalRow({
    id: 'g-future',
    title: 'Known',
    updatedAt: at(2),
  })
  const kept = mergeRow(SYNC_TABLE.GOALS, olderBuild, newerBuild).row
  check(
    'a field only the newer build has is kept',
    kept.newField === 'from the newer build',
  )
  check(
    'a group stamp this build does not know is carried along',
    (kept.fieldsAt as Record<string, string>)['brand-new'] === at(6),
  )

  const settingsLaptop = settingsRow(
    { calendar: { on: true } },
    everyGroupAt(at(1), SECTIONS, { calendar: at(5) }),
    at(5),
  )
  const settingsPhone = settingsRow(
    { notifications: { on: true } },
    everyGroupAt(at(1), SECTIONS, { notifications: at(6) }),
    at(6),
  )

  section('Settings: sections edited on two devices both survive')

  const sectionsMerged = mergeRow(
    SYNC_TABLE.SETTINGS,
    settingsLaptop,
    settingsPhone,
  ).row
  check(
    'a calendar edit and a notifications edit both survive',
    same(sectionsMerged.calendar, { on: true }) &&
      same(sectionsMerged.notifications, { on: true }),
    sectionsMerged,
  )
  check(
    'the merged settings row is stamped at the newest section',
    sectionsMerged.updatedAt === at(6),
  )

  const calendarOlder = settingsRow(
    { calendar: { on: false } },
    everyGroupAt(at(1), SECTIONS, { calendar: at(4) }),
    at(4),
  )
  const calendarNewer = settingsRow(
    { calendar: { on: true } },
    everyGroupAt(at(1), SECTIONS, { calendar: at(7) }),
    at(7),
  )
  check(
    'the same section edited twice: the newest section wins',
    same(
      mergeRow(SYNC_TABLE.SETTINGS, calendarOlder, calendarNewer).row.calendar,
      { on: true },
    ),
  )

  const withFuture = settingsRow(
    { ai: { model: 'next' } },
    everyGroupAt(at(1), SECTIONS, { ai: at(5) }),
    at(5),
  )
  const withoutFuture = settingsRow(
    {},
    everyGroupAt(at(1), SECTIONS, { notifications: at(6) }),
    at(6),
  )
  check(
    'an unknown settings section from a newer build is carried along',
    same(mergeRow(SYNC_TABLE.SETTINGS, withoutFuture, withFuture).row.ai, {
      model: 'next',
    }) &&
      same(mergeRow(SYNC_TABLE.SETTINGS, withFuture, withoutFuture).row.ai, {
        model: 'next',
      }),
  )

  section('Restore: a goal or template comes back as a current edit')

  check(
    'groups are named per table',
    groupNamesOf(SYNC_TABLE.TASK_TEMPLATES).includes('schedule') &&
      groupNamesOf(SYNC_TABLE.GOALS).includes('money'),
  )
  const restoredGoal = restampForRestore(
    goalRow({ id: 'g-back', fieldsAt: { details: at(1) } }),
    groupNamesOf(SYNC_TABLE.GOALS),
  )
  check(
    'a restored goal loses its group stamps, so the restore wins every group',
    restoredGoal.fieldsAt === undefined && restoredGoal.updatedAt !== at(1),
  )
}
