/**
 * A runnable check of the whole local half of sync, driven by an in-memory
 * server rather than a real one: tombstones, the dirty check, outbox ordering,
 * dedupe, backoff, dead-lettering, the merge rules, the first-login migration
 * and two devices editing the same rows.
 *
 *     npm run verify:sync
 *
 * It touches no browser API and no network, so it runs in plain node.
 */
import { ref, type Ref } from 'vue'
import { createSyncEngine, type SyncCollection } from '../../src/sync/engine'
import {
  createFakeServer,
  createFakeTransport,
  createMemorySnapshotBackend,
  serverCount,
  serverHas,
  serverRow,
  type FakeServer,
} from './fakeTransport'
import { diffRows, snapshotRows, stableStringify } from '../../src/sync/diff'
import { createOutbox } from '../../src/sync/outbox'
import {
  indexTombstones,
  mergeCollection,
  mergeIncoming,
  mergeRow,
} from '../../src/sync/merge'
import {
  addTombstones,
  makeTombstones,
  partitionLive,
  restampForRestore,
  sweepTombstones,
} from '../../src/sync/tombstoneRules'
import { carryOpenTasksForward } from '../../src/composables/goalSpace/dailyTasks'
import type { DailyTask, TaskTemplate } from '../../src/entities/TaskEntity'
import { createSnapshotStore } from '../../src/sync/snapshots'
import { createIdleTimer } from '../../src/composables/timer/machine'
import { mustRecordBeforeAdopting } from '../../src/composables/timer/remote'
import { TIMER_STATUS } from '../../src/entities/constants'
import { parseQuickAdd } from '../../src/composables/quickAdd/parse'
import {
  SYNC_TABLE,
  type Mutation,
  type SyncedRow,
  type TableName,
  type Tombstone,
} from '../../src/sync/types'

let failures = 0
let checks = 0

function check(label: string, condition: boolean, detail?: unknown) {
  checks += 1
  if (condition) {
    console.log(`  ok   ${label}`)
    return
  }
  failures += 1
  console.log(`  FAIL ${label}`)
  if (detail !== undefined) console.log(`       ${stableStringify(detail)}`)
}

function section(title: string) {
  console.log(`\n${title}`)
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Row stamps are client times and must look like real ones: the pull cursor is
 * the server's clock, and a row stamped in 1970 once exposed a bug where no
 * other device would ever pull it.
 */
const T0 = Date.parse('2026-10-01T00:00:00.000Z')

function iso(offsetMs: number): string {
  return new Date(T0 + offsetMs).toISOString()
}

/** For the sweep, which is measured against the real clock. */
function isoAbs(ms: number): string {
  return new Date(ms).toISOString()
}

async function settle(times = 4): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

/** A clock and timer queue the test drives by hand, so backoff is observable. */
function createFakeScheduler(start = 1_700_000_000_000) {
  let now = start
  let nextId = 0
  const timers = new Map<number, { at: number; fn: () => void }>()

  return {
    now: () => now,
    setTimer: (fn: () => void, ms: number) => {
      nextId += 1
      timers.set(nextId, { at: now + ms, fn })
      return nextId
    },
    clearTimer: (handle: unknown) => {
      timers.delete(handle as number)
    },
    pendingTimers: () => [...timers.values()].map((timer) => timer.at - now),
    advance: async (ms: number) => {
      now += ms
      const due = [...timers.entries()].filter(([, timer]) => timer.at <= now)
      due.forEach(([id]) => timers.delete(id))
      due.forEach(([, timer]) => timer.fn())
      await settle()
    },
  }
}

function memoryPersistence<T>() {
  let stored: T | null = null
  return {
    read: () => stored,
    write: (value: T) => {
      stored = value
    },
  }
}

/** The tombstone store, per device, without the Vue singleton or localStorage. */
function createMemoryTombstones() {
  let list: Tombstone[] = []
  return {
    all: () => list,
    merge: (incoming: Tombstone[]) => {
      list = addTombstones(list, incoming)
    },
    sweep: () => {
      list = sweepTombstones(list, Date.now())
    },
    bury: (table: TableName, rows: SyncedRow[], at: string) => {
      list = addTombstones(list, makeTombstones(table, rows, at))
    },
  }
}

// --- 1. tombstones -------------------------------------------------------

function verifyTombstones() {
  section('Tombstones')

  const now = Date.now()
  const fresh = makeTombstones(
    SYNC_TABLE.GOALS,
    [{ id: 'goal-1', updatedAt: isoAbs(now) }],
    isoAbs(now),
  )
  const old = makeTombstones(
    SYNC_TABLE.GOALS,
    [{ id: 'goal-2', updatedAt: isoAbs(now) }],
    isoAbs(now - 31 * MS_PER_DAY),
  )

  const swept = sweepTombstones([...fresh, ...old], now)
  check('a burial older than 30 days is swept', swept.length === 1)
  check('a recent burial survives the sweep', swept[0].id === 'goal-1')

  const twice = addTombstones(fresh, [
    { table: SYNC_TABLE.GOALS, id: 'goal-1', deletedAt: isoAbs(now + 1000) },
  ])
  check('re-burying a row keeps one record', twice.length === 1)
  check('the later burial wins', twice[0].deletedAt === isoAbs(now + 1000))

  const buried = makeTombstones(
    SYNC_TABLE.GOALS,
    [
      {
        id: 'goal-3',
        updatedAt: isoAbs(now - 5000),
        fieldsAt: { status: isoAbs(now - 9000) },
      },
    ],
    isoAbs(now - 1000),
  )
  const restored = restampForRestore(buried[0].payload as SyncedRow)
  check('a restored row loses its deletedAt', restored.deletedAt === undefined)
  check(
    'a restored row loses stale field stamps',
    restored.fieldsAt === undefined,
  )
  check(
    'a restored row is stamped later than its burial',
    (restored.updatedAt as string) > isoAbs(now - 1000),
  )
}

// --- 2. the dirty check --------------------------------------------------

function verifyDirtyCheck() {
  section('Dirty check')

  const row: SyncedRow = { id: 'a', title: 'One', updatedAt: iso(1000) }
  const shadow = snapshotRows([row])

  const unchanged = diffRows(shadow, [{ ...row }])
  check(
    're-reading an unchanged row queues nothing',
    unchanged.changes.length === 0,
  )

  const reordered = diffRows(shadow, [
    { updatedAt: iso(1000), title: 'One', id: 'a' } as SyncedRow,
  ])
  check(
    'a different key order is not a change',
    reordered.changes.length === 0,
    reordered.changes,
  )

  const undefinedAdded = diffRows(shadow, [
    { ...row, completedAt: undefined } as SyncedRow,
  ])
  check(
    'setting a field to undefined is not a change',
    undefinedAdded.changes.length === 0,
  )

  const edited = diffRows(shadow, [
    { ...row, title: 'Two', updatedAt: iso(2000) },
  ])
  check('a real edit is one upsert', edited.changes.length === 1)
  check('the edit is an upsert', edited.changes[0]?.op === 'upsert')

  const removed = diffRows(shadow, [])
  check('a vanished row becomes a delete', removed.changes[0]?.op === 'delete')

  const nested = snapshotRows([
    { id: 'b', tagIds: ['x', 'y'], theme: { accent: '#fff', intensity: 0.5 } },
  ])
  const nestedSame = diffRows(nested, [
    { id: 'b', theme: { intensity: 0.5, accent: '#fff' }, tagIds: ['x', 'y'] },
  ])
  check('nested objects compare by value', nestedSame.changes.length === 0)

  const nestedChanged = diffRows(nested, [
    { id: 'b', tagIds: ['y', 'x'], theme: { accent: '#fff', intensity: 0.5 } },
  ])
  check(
    'array order still counts as a change',
    nestedChanged.changes.length === 1,
  )
}

// --- 3. the outbox ------------------------------------------------------

async function verifyOutbox() {
  section('Outbox')

  const scheduler = createFakeScheduler()
  const server = createFakeServer()
  let reject:
    | ((mutation: Mutation) => { retryable: boolean; error: string } | null)
    | null = null
  let failCall: (() => string | null) | null = null
  let online = true

  const transport = createFakeTransport(server, {
    reject: (mutation) => reject?.(mutation) ?? null,
    failCall: () => failCall?.() ?? null,
  })

  const outbox = createOutbox({
    transport: () => transport,
    now: scheduler.now,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
    isOnline: () => online,
    random: () => 1,
    baseBackoffMs: 1000,
    maxBackoffMs: 8000,
  })

  outbox.enqueue(SYNC_TABLE.GOALS, 'g1', 'upsert', { id: 'g1', n: 1 }, iso(1))
  outbox.enqueue(SYNC_TABLE.GOALS, 'g1', 'upsert', { id: 'g1', n: 2 }, iso(2))
  outbox.enqueue(SYNC_TABLE.GOALS, 'g1', 'upsert', { id: 'g1', n: 3 }, iso(3))
  check('three edits to one row collapse into one', outbox.pending.length === 1)
  check(
    'the collapsed write carries the newest value',
    (outbox.pending[0].payload as unknown as { n: number }).n === 3,
  )

  outbox.enqueue(SYNC_TABLE.GOALS, 'g2', 'upsert', { id: 'g2' }, iso(4))
  outbox.enqueue(SYNC_TABLE.GOALS, 'g1', 'delete', undefined, iso(5))
  check('a delete replaces the pending upsert', outbox.pending.length === 2)
  check(
    'the delete is what is left for that row',
    outbox.pending.find((item) => item.rowId === 'g1')?.op === 'delete',
  )

  const order = outbox.pending.map((item) => item.seq)
  check(
    'the queue keeps the order edits were made in',
    order.every((value, index) => index === 0 || value > order[index - 1]),
  )

  await outbox.flush()
  check('a clean flush empties the queue', outbox.queued === 0)
  check(
    'the server kept the surviving row',
    serverHas(server, SYNC_TABLE.GOALS, 'g2'),
  )
  check(
    'the deleted row is gone from the server',
    !serverHas(server, SYNC_TABLE.GOALS, 'g1'),
  )
  check('the server recorded the deletion', server.tombstones.length === 1)

  // Offline: edits queue up and nothing is lost.
  online = false
  outbox.enqueue(SYNC_TABLE.GOALS, 'g3', 'upsert', { id: 'g3' }, iso(6))
  await outbox.flush()
  check('an offline flush keeps the edit queued', outbox.queued === 1)
  online = true
  await outbox.flush()
  check('coming back online drains the queue', outbox.queued === 0)

  // A retryable failure backs off, doubling with each attempt.
  failCall = () => 'connection reset'
  outbox.enqueue(SYNC_TABLE.GOALS, 'g4', 'upsert', { id: 'g4' }, iso(7))
  await outbox.flush()
  check('a dropped connection leaves the edit queued', outbox.queued === 1)
  const firstDelay = scheduler.pendingTimers()[0]
  check(
    'the first retry waits one base interval',
    firstDelay === 1000,
    firstDelay,
  )

  await scheduler.advance(1000)
  const secondDelay = scheduler.pendingTimers()[0]
  check(
    'the second retry waits twice as long',
    secondDelay === 2000,
    secondDelay,
  )

  await scheduler.advance(2000)
  const thirdDelay = scheduler.pendingTimers()[0]
  check('backoff keeps doubling', thirdDelay === 4000, thirdDelay)

  failCall = null
  await scheduler.advance(4000)
  check('the edit lands once the server answers again', outbox.queued === 0)
  check(
    'nothing was dead-lettered by a retryable failure',
    outbox.dead.length === 0,
  )

  // A refused row leaves the queue and does not hold up its neighbours.
  reject = (mutation) =>
    mutation.rowId === 'poison'
      ? { retryable: false, error: 'row-level security' }
      : null

  outbox.enqueue(SYNC_TABLE.GOALS, 'poison', 'upsert', { id: 'poison' }, iso(8))
  outbox.enqueue(SYNC_TABLE.GOALS, 'g5', 'upsert', { id: 'g5' }, iso(9))
  outbox.enqueue(SYNC_TABLE.GOALS, 'g6', 'upsert', { id: 'g6' }, iso(10))
  await outbox.flush()

  check('the refused row is dead-lettered', outbox.dead.length === 1)
  check('the dead letter names the row', outbox.dead[0].rowId === 'poison')
  check(
    'the dead letter keeps the reason',
    outbox.dead[0].lastError === 'row-level security',
  )
  check('the queue is empty despite the refusal', outbox.queued === 0)
  check(
    'the healthy rows got through',
    serverHas(server, SYNC_TABLE.GOALS, 'g5') &&
      serverHas(server, SYNC_TABLE.GOALS, 'g6'),
  )

  reject = null
  outbox.retryDead()
  await outbox.flush()
  check('retrying a dead letter clears it', outbox.dead.length === 0)
  check(
    'the retried row reached the server',
    serverHas(server, SYNC_TABLE.GOALS, 'poison'),
  )

  // An edit made while a push is in the air must not be lost by the push.
  failCall = () => null
  const slowServer = createFakeServer()
  const slowTransport = createFakeTransport(slowServer)
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const gatedTransport = {
    pull: slowTransport.pull,
    push: async (_mutations: Mutation[]) => {
      await gate
      throw new Error('lost after the wire')
    },
  }

  const gatedOutbox = createOutbox({
    transport: () => gatedTransport,
    now: scheduler.now,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
    isOnline: () => true,
    random: () => 1,
  })

  gatedOutbox.enqueue(
    SYNC_TABLE.GOALS,
    'g7',
    'upsert',
    { id: 'g7', n: 1 },
    iso(11),
  )
  const flight = gatedOutbox.flush()
  gatedOutbox.enqueue(
    SYNC_TABLE.GOALS,
    'g7',
    'upsert',
    { id: 'g7', n: 2 },
    iso(12),
  )
  release()
  await flight

  check(
    'an in-flight failure does not duplicate the row',
    gatedOutbox.queued === 1,
  )
  check(
    'the newer edit survives the failed push',
    (gatedOutbox.pending[0].payload as unknown as { n: number }).n === 2,
  )
}

// --- 4. merge rules -----------------------------------------------------

function verifyMerge() {
  section('Merge rules')

  const older: SyncedRow = { id: 'r', title: 'old', updatedAt: iso(1000) }
  const newer: SyncedRow = { id: 'r', title: 'new', updatedAt: iso(2000) }

  check(
    'the later edit wins a plain row',
    mergeRow(SYNC_TABLE.GOALS, older, newer).row.title === 'new',
  )
  check(
    'order of arguments does not matter',
    mergeRow(SYNC_TABLE.GOALS, newer, older).row.title === 'new',
  )
  check(
    'a row with no stamp loses to one with a stamp',
    mergeRow(SYNC_TABLE.GOALS, { id: 'r' }, newer).row.title === 'new',
  )
  check(
    'createdAt stands in for a missing updatedAt',
    mergeRow(
      SYNC_TABLE.GOALS,
      { id: 'r', title: 'created', createdAt: iso(3000) },
      newer,
    ).row.title === 'created',
  )

  // The case the whole per-field idea exists for.
  const tickedOnPhone: SyncedRow = {
    id: 'task::2026-10-06',
    status: 'done',
    completedAt: iso(5000),
    startTime: '09:00',
    endTime: '10:00',
    updatedAt: iso(5000),
    fieldsAt: { status: iso(5000) },
  }
  const movedOnLaptop: SyncedRow = {
    id: 'task::2026-10-06',
    status: 'todo',
    completedAt: undefined,
    startTime: '14:00',
    endTime: '15:00',
    updatedAt: iso(6000),
    fieldsAt: { time: iso(6000) },
  }

  const bothKept = mergeRow(
    SYNC_TABLE.DAILY_TASKS,
    tickedOnPhone,
    movedOnLaptop,
  )
  check(
    'a day row merges rather than overwrites',
    bothKept.outcome === 'merged',
  )
  check('the tick from the phone survives', bothKept.row.status === 'done')
  check(
    'the reschedule from the laptop survives',
    bothKept.row.startTime === '14:00',
  )
  check(
    'the merged row is stamped at the later of the two',
    bothKept.row.updatedAt === iso(6000),
  )

  const reMerged = mergeRow(SYNC_TABLE.DAILY_TASKS, bothKept.row, movedOnLaptop)
  check('merging again changes nothing', reMerged.row.status === 'done')

  const sameGroupTwice = mergeRow(
    SYNC_TABLE.DAILY_TASKS,
    {
      id: 'd',
      status: 'done',
      updatedAt: iso(1000),
      fieldsAt: { status: iso(1000) },
    },
    {
      id: 'd',
      status: 'skipped',
      updatedAt: iso(2000),
      fieldsAt: { status: iso(2000) },
    },
  )
  check(
    'two edits to the same group are decided by time',
    sameGroupTwice.row.status === 'skipped',
  )

  // Tombstones against edits.
  const buried = new Map([[`${SYNC_TABLE.GOALS}\u0000r`, iso(3000)]])
  const deletionWins = mergeCollection(
    SYNC_TABLE.GOALS,
    [older],
    [older],
    buried,
  )
  check('a later deletion removes the row', deletionWins.merged.length === 0)
  check(
    'the deletion is passed on to the server',
    deletionWins.toDelete.length === 1,
  )

  const editWins = mergeCollection(
    SYNC_TABLE.GOALS,
    [{ id: 'r', title: 'revived', updatedAt: iso(4000) }],
    [older],
    buried,
  )
  check(
    'an edit after the deletion revives the row',
    editWins.merged.length === 1,
  )
  check('the revival is pushed', editWins.toPush.length === 1)

  const localOnly = mergeCollection(SYNC_TABLE.GOALS, [older], [])
  check(
    'a row the server has never seen is pushed, not dropped',
    localOnly.toPush.length === 1,
  )
  check('and it is kept locally', localOnly.merged.length === 1)

  const remoteOnly = mergeCollection(SYNC_TABLE.GOALS, [], [newer])
  check('a row only the server has is taken', remoteOnly.merged.length === 1)
  check('and is not pushed back', remoteOnly.toPush.length === 0)

  // An incremental pull must leave untouched rows alone.
  const many: SyncedRow[] = Array.from({ length: 50 }, (_, index) => ({
    id: `row-${index}`,
    updatedAt: iso(1000),
  }))
  const incremental = mergeIncoming(SYNC_TABLE.GOALS, many, [
    { id: 'row-7', updatedAt: iso(9000), title: 'changed' },
  ])
  check(
    'an incremental pull pushes nothing it was not asked about',
    incremental.toPush.length === 0,
  )
  check('it still keeps every local row', incremental.merged.length === 50)
  check(
    'and it applies the row that did change',
    incremental.merged.find((row) => row.id === 'row-7')?.title === 'changed',
  )

  const incrementalDelete = mergeIncoming(
    SYNC_TABLE.GOALS,
    [{ id: 'row-1', updatedAt: iso(1000) }],
    [],
    [{ table: SYNC_TABLE.GOALS, id: 'row-1', deletedAt: iso(2000) }],
  )
  check(
    'a deletion from elsewhere removes the row',
    incrementalDelete.merged.length === 0,
  )

  const incrementalRevive = mergeIncoming(
    SYNC_TABLE.GOALS,
    [{ id: 'row-1', updatedAt: iso(3000) }],
    [],
    [{ table: SYNC_TABLE.GOALS, id: 'row-1', deletedAt: iso(2000) }],
  )
  check(
    'a newer local edit beats that deletion',
    incrementalRevive.merged.length === 1,
  )
  check('and is pushed back', incrementalRevive.toPush.length === 1)
}

// --- 5. two devices -----------------------------------------------------

interface Device {
  name: string
  goals: Ref<SyncedRow[]>
  templates: Ref<SyncedRow[]>
  rows: Ref<SyncedRow[]>
  entries: Ref<SyncedRow[]>
  timer: Ref<SyncedRow[]>
  engine: ReturnType<typeof createSyncEngine>
  tombstones: ReturnType<typeof createMemoryTombstones>
  online: { value: boolean }
  signedIn: { value: boolean }
  account: { value: string }
  failing: { value: boolean }
  snapshots: ReturnType<typeof createSnapshotStore>
  backend: ReturnType<typeof createMemorySnapshotBackend>
}

function createDevice(
  name: string,
  server: FakeServer,
  userId: string,
): Device {
  const goals = ref<SyncedRow[]>([])
  const templates = ref<SyncedRow[]>([])
  const rows = ref<SyncedRow[]>([])
  const entries = ref<SyncedRow[]>([])
  const timer = ref<SyncedRow[]>([])
  const online = { value: true }
  const signedIn = { value: true }
  const account = { value: userId }
  const failing = { value: false }
  const tombstones = createMemoryTombstones()
  const backend = createMemorySnapshotBackend()
  const snapshots = createSnapshotStore(backend)

  const transport = createFakeTransport(server, {
    failCall: () => (failing.value ? 'network down' : null),
  })

  const collections: SyncCollection[] = [
    {
      table: SYNC_TABLE.GOALS,
      track: () => goals.value,
      read: () => goals.value,
      write: (next) => {
        goals.value = next
      },
    },
    {
      table: SYNC_TABLE.TASK_TEMPLATES,
      track: () => templates.value,
      read: () => templates.value,
      write: (next) => {
        templates.value = next
      },
    },
    {
      table: SYNC_TABLE.DAILY_TASKS,
      track: () => rows.value,
      read: () => rows.value,
      write: (next) => {
        rows.value = next
      },
    },
    {
      table: SYNC_TABLE.TIME_ENTRIES,
      track: () => entries.value,
      read: () => entries.value,
      write: (next) => {
        entries.value = next
      },
    },
    {
      table: SYNC_TABLE.ACTIVE_TIMER,
      track: () => timer.value,
      read: () => timer.value,
      write: (next) => {
        timer.value = next
      },
    },
  ]

  const engine = createSyncEngine({
    transport: () => transport,
    userId: () => (signedIn.value ? account.value : null),
    isSignedOut: () => !signedIn.value,
    now: () => Date.now(),
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (handle) =>
      clearTimeout(handle as ReturnType<typeof setTimeout>),
    isOnline: () => online.value,
    random: () => 1,
    snapshots,
    buildBackup: () => ({
      format: 'dayforge-backup',
      goals: goals.value,
      taskTemplates: templates.value,
      dailyTasks: rows.value,
    }),
    tombstones: {
      all: tombstones.all,
      merge: tombstones.merge,
      sweep: tombstones.sweep,
    },
    outboxPersistence: memoryPersistence(),
    metaPersistence: memoryPersistence(),
    debounceMs: 0,
  })

  engine.register(collections)

  return {
    name,
    goals,
    templates,
    rows,
    entries,
    timer,
    engine,
    tombstones,
    online,
    signedIn,
    account,
    failing,
    snapshots,
    backend,
  }
}

// --- 5. the defensive filter -------------------------------------------

/**
 * A row marked deleted must never reach a live array, from storage or from the
 * server — and hiding it is not enough. If the deletion is not recorded and
 * pushed, the server's copy arrives again on the very next pull, for ever.
 */
async function verifyHealingFilter() {
  section('The defensive filter')

  const split = partitionLive(SYNC_TABLE.GOALS, [
    { id: 'live-1', updatedAt: iso(1000) },
    { id: 'buried-1', updatedAt: iso(1000), deletedAt: iso(2000) },
  ])

  check('a live row is kept', split.live.length === 1)
  check('and it is the right one', split.live[0]?.id === 'live-1')
  check('a marked row is taken out', split.stones.length === 1)
  check(
    'the burial keeps the row own stamp, not this moment',
    split.stones[0]?.deletedAt === iso(2000),
  )
  check(
    'and it keeps enough of the row to put it back',
    (split.stones[0]?.payload as SyncedRow | undefined)?.id === 'buried-1',
  )

  // Now the same thing through the engine, from a server that holds one.
  const server = createFakeServer()
  const userId = 'user-heal'

  server.rows.get(SYNC_TABLE.GOALS)?.set('ghost', {
    row: {
      id: 'ghost',
      title: 'Should not appear',
      updatedAt: iso(1000),
      deletedAt: iso(1500),
    },
    serverStamp: '2030-01-01T00:00:000001Z',
  })
  server.rows.get(SYNC_TABLE.GOALS)?.set('real', {
    row: { id: 'real', title: 'Keep me', updatedAt: iso(1000) },
    serverStamp: '2030-01-01T00:00:000002Z',
  })

  const device = createDevice('healer', server, userId)
  await device.engine.onSignedIn()
  await settle()
  await device.engine.flush()
  await settle()

  check(
    'the marked row never reaches the array',
    device.goals.value.length === 1,
  )
  check('the ordinary row did', device.goals.value[0]?.id === 'real')
  check(
    'the burial was recorded rather than merely obeyed',
    device.tombstones.all().some((stone) => stone.id === 'ghost'),
  )
  check(
    'and the deletion was sent, so the server stops holding it',
    !serverHas(server, SYNC_TABLE.GOALS, 'ghost'),
  )

  // The proof that it healed: a second device pulling afresh sees nothing.
  const other = createDevice('other', server, userId)
  await other.engine.onSignedIn()
  await settle()
  check(
    'a fresh device is never handed the healed row',
    other.goals.value.every((row) => row.id !== 'ghost'),
  )

  // And it does not come back here either.
  await device.engine.pull()
  await settle()
  check('nor does it return on the next pull', device.goals.value.length === 1)
}

// --- 6. a row re-sent after it was deleted here -------------------------

/**
 * The other device can push an edit it made *before* the deletion, which lands
 * after it. The row says nothing newer than the burial, so taking it would be
 * a resurrection — the deletion has to go back out instead.
 */
function verifyLateArrivalAfterDelete() {
  section('A row re-sent after it was deleted here')

  const tombstones = indexTombstones([
    { table: SYNC_TABLE.TASK_TEMPLATES, id: 't1', deletedAt: iso(5000) },
  ])

  const stale = mergeIncoming(
    SYNC_TABLE.TASK_TEMPLATES,
    [],
    [{ id: 't1', title: 'Back from the dead', updatedAt: iso(3000) }],
    [],
    tombstones,
  )

  check('an older edit does not resurrect the row', stale.merged.length === 0)
  check('and the deletion is sent again', stale.toDelete.includes('t1'))

  const genuine = mergeIncoming(
    SYNC_TABLE.TASK_TEMPLATES,
    [],
    [{ id: 't1', title: 'Deliberately revived', updatedAt: iso(9000) }],
    [],
    tombstones,
  )

  check(
    'an edit made after the deletion does revive it',
    genuine.merged.length === 1,
  )
  check('and it is not deleted again', genuine.toDelete.length === 0)

  // Without a burial on record, nothing changes about an ordinary new row.
  const plain = mergeIncoming(
    SYNC_TABLE.TASK_TEMPLATES,
    [],
    [{ id: 't2', updatedAt: iso(1000) }],
  )
  check(
    'a row with no burial behind it is simply taken',
    plain.merged.length === 1,
  )
}

// --- 7. carry-forward must not overwrite another device's tick ----------

function verifyCarryForward() {
  section('Carrying tasks forward')

  const templates = [
    { id: 'tpl-project', title: 'Project', priority: 'major', isActive: true },
    {
      id: 'tpl-child',
      title: 'Child',
      priority: 'minor',
      isActive: true,
      parentTemplateId: 'tpl-project',
    },
  ] as unknown as TaskTemplate[]

  const today = '2026-10-09'
  const yesterday = '2026-10-08'

  function dayRows(projectStatus: string, completedAt?: string): DailyTask[] {
    return [
      {
        id: `tpl-project::${yesterday}`,
        date: yesterday,
        templateId: 'tpl-project',
        title: 'Project',
        status: projectStatus,
        priority: 'major',
        tagIds: [],
        completedAt,
        updatedAt: iso(1000),
        fieldsAt: { status: iso(1000) },
      },
      {
        id: `tpl-child::${yesterday}`,
        date: yesterday,
        templateId: 'tpl-child',
        title: 'Child',
        status: 'todo',
        priority: 'minor',
        tagIds: [],
        parentDailyTaskId: `tpl-project::${yesterday}`,
        updatedAt: iso(1000),
        fieldsAt: { status: iso(1000) },
      },
    ] as unknown as DailyTask[]
  }

  // An open project carried along keeps the status stamp it had: nothing about
  // its status changed, and a stamp dated now is what overwrites other devices.
  const openCase = dayRows('todo')
  carryOpenTasksForward(templates, openCase, today)

  const movedProject = openCase.find((row) => row.templateId === 'tpl-project')
  const movedStamps = (movedProject as unknown as SyncedRow | undefined)
    ?.fieldsAt as Record<string, string> | undefined

  check('an open project is carried to today', movedProject?.date === today)
  // The move itself is a real change and says so; its status is not, and must
  // not acquire a stamp dated now — that is what overwrites another device.
  check('the move stamps the date group', movedStamps?.date !== iso(1000))
  check(
    'but the status stamp is left alone',
    movedStamps?.status === iso(1000),
    movedStamps,
  )

  // A project finished on its own day still reopens: that is the whole point.
  const staleDone = dayRows('done', `${yesterday}T18:00:00.000Z`)
  carryOpenTasksForward(templates, staleDone, today)
  const reopened = staleDone.find((row) => row.templateId === 'tpl-project')
  check(
    'a project finished on its own day reopens',
    reopened?.status === 'todo',
  )
  check('and its completion is cleared', reopened?.completedAt === undefined)

  // Ticked off today, while this row still sat on yesterday: that tick came
  // from somewhere else, and reopening would push it away on the next sync.
  const remoteDone = dayRows('done', `${today}T07:30:00.000Z`)
  carryOpenTasksForward(templates, remoteDone, today)
  const kept = remoteDone.find((row) => row.templateId === 'tpl-project')
  check("another device's tick is left standing", kept?.status === 'done')
  check(
    'and its completion is not thrown away',
    kept?.completedAt === `${today}T07:30:00.000Z`,
  )
  check(
    'while the open task still moves to today',
    remoteDone.find((row) => row.templateId === 'tpl-child')?.date === today,
  )
}

async function verifyTwoDevices() {
  section('Two devices, one account')

  const server = createFakeServer()
  const userId = 'user-1'
  const laptop = createDevice('laptop', server, userId)

  // The laptop already has a few things, as the owner's browser does today.
  laptop.goals.value = [
    { id: 'goal-work', title: 'Work', status: 'active', updatedAt: iso(1000) },
  ]
  laptop.templates.value = [
    {
      id: 'task-report',
      title: 'Report',
      goalId: 'goal-work',
      updatedAt: iso(1000),
    },
  ]
  laptop.rows.value = [
    {
      id: 'task-report::2026-10-06',
      templateId: 'task-report',
      date: '2026-10-06',
      status: 'todo',
      updatedAt: iso(1000),
    },
  ]
  await settle()

  await laptop.engine.onSignedIn()
  await laptop.engine.flush()

  check(
    'a first sign-in with an empty server uploads everything',
    serverCount(server, SYNC_TABLE.GOALS) === 1 &&
      serverCount(server, SYNC_TABLE.TASK_TEMPLATES) === 1 &&
      serverCount(server, SYNC_TABLE.DAILY_TASKS) === 1,
  )
  check('and it asked nothing', laptop.engine.status.value.deadLettered === 0)
  check(
    'no snapshot is taken when there was nothing to lose',
    (await laptop.backend.list()).length === 0,
  )

  // The phone has its own local data and has never signed in.
  const phone = createDevice('phone', server, userId)
  phone.goals.value = [
    { id: 'goal-home', title: 'Home', status: 'active', updatedAt: iso(1500) },
  ]
  await settle()

  await phone.engine.onSignedIn()
  await phone.engine.flush()

  check(
    'a first sign-in with data on both sides takes a snapshot first',
    (await phone.backend.list()).length === 1,
  )
  check(
    'the phone ends up with both projects',
    phone.goals.value.length === 2,
    phone.goals.value,
  )
  check('and the server has both', serverCount(server, SYNC_TABLE.GOALS) === 2)
  check(
    'the phone also received the laptop day row',
    phone.rows.value.length === 1,
  )

  await laptop.engine.pull()
  check(
    'the laptop picks up the project made on the phone',
    laptop.goals.value.length === 2,
  )

  // The same day row, edited differently on each device while both are offline.
  laptop.online.value = false
  phone.online.value = false

  const laptopRow = laptop.rows.value.find(
    (row) => row.id === 'task-report::2026-10-06',
  )
  if (laptopRow) {
    laptopRow.status = 'done'
    laptopRow.completedAt = iso(7000)
    laptopRow.updatedAt = iso(7000)
    laptopRow.fieldsAt = { status: iso(7000) }
  }

  const phoneRow = phone.rows.value.find(
    (row) => row.id === 'task-report::2026-10-06',
  )
  if (phoneRow) {
    phoneRow.startTime = '14:00'
    phoneRow.endTime = '15:00'
    phoneRow.updatedAt = iso(8000)
    phoneRow.fieldsAt = { time: iso(8000) }
  }
  await settle()

  check(
    'the offline laptop has the tick queued',
    laptop.engine.status.value.queued === 1,
  )
  check(
    'the offline phone has the reschedule queued',
    phone.engine.status.value.queued === 1,
  )
  check(
    'the offline laptop reports itself offline',
    laptop.engine.status.value.state === 'offline',
  )

  laptop.online.value = true
  await laptop.engine.flush()
  phone.online.value = true
  await phone.engine.flush()
  await phone.engine.pull()
  await laptop.engine.pull()

  const settled = laptop.rows.value.find(
    (row) => row.id === 'task-report::2026-10-06',
  )
  check(
    'the tick made on the laptop survived',
    settled?.status === 'done',
    settled,
  )
  check(
    'the reschedule made on the phone survived',
    settled?.startTime === '14:00',
    settled,
  )

  // The laptop merged the two halves on its pull and queued the result; that
  // has to reach the server before the phone can see it.
  await laptop.engine.flush()
  await phone.engine.pull()
  const onPhone = phone.rows.value.find(
    (row) => row.id === 'task-report::2026-10-06',
  )
  check(
    'both devices agree on the result',
    onPhone?.status === 'done' && onPhone?.startTime === '14:00',
    onPhone,
  )

  // A deletion on one device must not come back from the other.
  const deletedAt = iso(9000)
  laptop.tombstones.bury(
    SYNC_TABLE.TASK_TEMPLATES,
    laptop.templates.value.filter((row) => row.id === 'task-report'),
    deletedAt,
  )
  laptop.templates.value = laptop.templates.value.filter(
    (row) => row.id !== 'task-report',
  )
  await settle()
  await laptop.engine.flush()

  check(
    'the deletion reached the server',
    !serverHas(server, SYNC_TABLE.TASK_TEMPLATES, 'task-report'),
  )

  await phone.engine.pull()
  check(
    'the other device drops the deleted task',
    phone.templates.value.some((row) => row.id === 'task-report') === false,
    phone.templates.value,
  )

  await laptop.engine.pull()
  check(
    'and the deleting device is not handed it back',
    laptop.templates.value.some((row) => row.id === 'task-report') === false,
    laptop.templates.value,
  )

  // Churn that changes nothing must not reach the queue.
  const before = laptop.engine.status.value.queued
  const rowsNow = laptop.rows.value
  laptop.rows.value = [...rowsNow]
  rowsNow.forEach((row) => {
    // A write of the same value on purpose: it must not count as a change.
    // eslint-disable-next-line no-self-assign
    row.parentDailyTaskId = row.parentDailyTaskId
  })
  await settle()
  check(
    'rebuilding the day without changing a value queues nothing',
    laptop.engine.status.value.queued === before,
  )

  // Time entries: append-only history, and a deletion that sticks.
  laptop.entries.value = [
    {
      id: 'entry-1',
      sessionId: 's1',
      startedAt: iso(10_000),
      endedAt: iso(11_000),
      updatedAt: iso(11_000),
    },
  ]
  await settle()
  await laptop.engine.flush()
  await phone.engine.pull()
  check('history reaches the other device', phone.entries.value.length === 1)

  const snapshots = await phone.snapshots.list()
  check('the snapshot is retrievable for a restore', snapshots.length === 1)
  check(
    'and it holds the state from before the merge',
    ((snapshots[0].payload as { goals: SyncedRow[] }).goals ?? []).length === 1,
  )
}

/**
 * A rename on one device and a recolour on the other, both made offline, must
 * both survive. The engine stamps only the groups each edit changed.
 */
async function verifyFieldGroupsAcrossDevices() {
  section('Two devices edit different fields of one project')

  const server = createFakeServer()
  const userId = 'user-groups'
  const laptop = createDevice('laptop', server, userId)
  laptop.goals.value = [
    {
      id: 'goal-field',
      title: 'Work',
      status: 'active',
      accentColor: '#111111',
      createdAt: iso(900),
      updatedAt: iso(1000),
    },
  ]
  await settle()
  await laptop.engine.onSignedIn()
  await laptop.engine.flush()

  const phone = createDevice('phone', server, userId)
  await settle()
  await phone.engine.onSignedIn()
  await phone.engine.flush()
  await phone.engine.pull()
  check('the phone receives the project', phone.goals.value.length === 1)

  laptop.online.value = false
  phone.online.value = false
  laptop.goals.value[0].title = 'Client work'
  phone.goals.value[0].accentColor = '#ff7a2f'
  await settle()

  // Each device syncs the way the app does: pull first, then push what it
  // holds merged. A push from a device that has not pulled can overwrite a
  // group on the server; the other device re-pushes its copy on its next sync.
  laptop.online.value = true
  await laptop.engine.sync()
  phone.online.value = true
  await phone.engine.sync()
  await laptop.engine.sync()

  const onLaptop = laptop.goals.value.find((goal) => goal.id === 'goal-field')
  const onPhone = phone.goals.value.find((goal) => goal.id === 'goal-field')
  check(
    'the laptop keeps the rename and gets the recolour',
    onLaptop?.title === 'Client work' && onLaptop?.accentColor === '#ff7a2f',
    onLaptop,
  )
  check(
    'the phone keeps the recolour and gets the rename',
    onPhone?.title === 'Client work' && onPhone?.accentColor === '#ff7a2f',
    onPhone,
  )
  const stored = serverRow(server, SYNC_TABLE.GOALS, 'goal-field')
  check(
    'the server holds both edits, each in its own group',
    stored?.title === 'Client work' &&
      stored?.accentColor === '#ff7a2f' &&
      (stored?.fieldsAt as Record<string, string> | undefined)?.details !==
        undefined,
    stored,
  )
}

function findRow(list: SyncedRow[], id: string): SyncedRow | undefined {
  return list.find((row) => row.id === id)
}

async function verifyEverydayRoutine() {
  section('Phone in the evening, laptop during the day')

  const server = createFakeServer()
  const userId = 'user-2'
  const laptop = createDevice('laptop', server, userId)
  const phone = createDevice('phone', server, userId)

  await laptop.engine.sync()
  await phone.engine.sync()

  phone.templates.value = [
    { id: 'task-gym', title: 'Gym', updatedAt: new Date().toISOString() },
  ]
  phone.rows.value = [
    {
      id: 'task-gym::2026-10-11',
      templateId: 'task-gym',
      date: '2026-10-11',
      status: 'todo',
      updatedAt: new Date().toISOString(),
    },
  ]
  await settle()
  await phone.engine.flush()

  await laptop.engine.sync()
  check(
    'the task planned on the phone is on the laptop after one sync',
    findRow(laptop.templates.value, 'task-gym') !== undefined &&
      findRow(laptop.rows.value, 'task-gym::2026-10-11') !== undefined,
  )

  const row = findRow(laptop.rows.value, 'task-gym::2026-10-11')
  if (row) {
    const at = new Date(Date.now() + 1000).toISOString()
    row.status = 'done'
    row.updatedAt = at
    row.fieldsAt = { status: at }
  }
  laptop.entries.value = [
    {
      id: 'entry-gym',
      sessionId: 's-gym',
      templateId: 'task-gym',
      startedAt: iso(0),
      endedAt: iso(60_000),
      updatedAt: new Date().toISOString(),
    },
  ]
  await settle()
  await laptop.engine.sync()
  await phone.engine.sync()

  check(
    'the tick made on the laptop is on the phone',
    findRow(phone.rows.value, 'task-gym::2026-10-11')?.status === 'done',
  )
  check(
    'the time tracked on the laptop is on the phone',
    findRow(phone.entries.value, 'entry-gym') !== undefined,
  )

  section('An edit that forgot its stamp')

  const template = findRow(phone.templates.value, 'task-gym')
  const stampBefore = template?.updatedAt
  await new Promise((resolve) => setTimeout(resolve, 5))
  if (template) template.title = 'Gym, legs day'
  await settle()
  check(
    'the engine stamps it so it can win a merge',
    template !== undefined && template.updatedAt !== stampBefore,
    template,
  )
  await phone.engine.flush()
  await laptop.engine.sync()
  check(
    'and the other device takes it',
    findRow(laptop.templates.value, 'task-gym')?.title === 'Gym, legs day',
    laptop.templates.value,
  )

  section('A stale queued edit meets a newer one from the other device')

  laptop.online.value = false
  const onLaptop = findRow(laptop.templates.value, 'task-gym')
  if (onLaptop) {
    onLaptop.title = 'Old idea'
    onLaptop.updatedAt = new Date(Date.now() - 60_000).toISOString()
  }
  await settle()
  check(
    'the laptop has it queued while offline',
    laptop.engine.status.value.queued === 1,
  )

  const onPhone = findRow(phone.templates.value, 'task-gym')
  if (onPhone) {
    onPhone.title = 'Newest idea'
    onPhone.updatedAt = new Date().toISOString()
  }
  await settle()
  await phone.engine.flush()

  laptop.online.value = true
  await laptop.engine.sync()
  check(
    'the laptop ends up with the newer edit',
    findRow(laptop.templates.value, 'task-gym')?.title === 'Newest idea',
    laptop.templates.value,
  )
  check(
    'its stale write left the queue',
    laptop.engine.status.value.queued === 0,
  )
  check(
    'and the server still holds the newer edit',
    serverRow(server, SYNC_TABLE.TASK_TEMPLATES, 'task-gym')?.title ===
      'Newest idea',
  )

  section('Edits made while signed out')

  phone.signedIn.value = false
  phone.engine.onSignedOut()
  phone.goals.value = [
    ...phone.goals.value,
    {
      id: 'goal-offline',
      title: 'Written signed out',
      updatedAt: new Date().toISOString(),
    },
  ]
  await settle()
  check(
    'nothing is queued without an account',
    phone.engine.status.value.queued === 0,
  )

  phone.signedIn.value = true
  await phone.engine.onSignedIn()
  check(
    'signing back in sends them',
    serverHas(server, SYNC_TABLE.GOALS, 'goal-offline'),
  )
  await laptop.engine.sync()
  check(
    'and the other device receives them',
    findRow(laptop.goals.value, 'goal-offline') !== undefined,
  )

  section('A first sign-in that could not reach the server')

  const tablet = createDevice('tablet', server, userId)
  tablet.goals.value = [
    { id: 'goal-tablet', title: 'Tablet', updatedAt: new Date().toISOString() },
  ]
  await settle()
  tablet.failing.value = true
  await tablet.engine.onSignedIn()
  check(
    'nothing reached the server yet',
    !serverHas(server, SYNC_TABLE.GOALS, 'goal-tablet'),
  )
  check('the error is reported', tablet.engine.status.value.lastError !== null)

  tablet.failing.value = false
  await tablet.engine.sync()
  check(
    'the next automatic sync finishes the first merge',
    serverHas(server, SYNC_TABLE.GOALS, 'goal-tablet') &&
      findRow(tablet.goals.value, 'goal-offline') !== undefined &&
      findRow(tablet.templates.value, 'task-gym') !== undefined,
    {
      server: serverHas(server, SYNC_TABLE.GOALS, 'goal-tablet'),
      goals: tablet.goals.value,
      status: tablet.engine.status.value,
    },
  )
}

async function verifyAccountSwitch() {
  section('Another account on the same device')

  const server = createFakeServer()
  const laptop = createDevice('laptop', server, 'user-a')
  await laptop.engine.sync()

  laptop.online.value = false
  laptop.goals.value = [
    {
      id: 'goal-a',
      title: 'Account A, offline',
      updatedAt: new Date().toISOString(),
    },
  ]
  await settle()
  check(
    'the offline edit waits in the queue',
    laptop.engine.status.value.queued === 1,
  )

  laptop.signedIn.value = false
  laptop.engine.onSignedOut()
  check('signing out keeps the queue', laptop.engine.status.value.queued === 1)

  laptop.account.value = 'user-b'
  laptop.signedIn.value = true
  laptop.goals.value = [
    ...laptop.goals.value,
    {
      id: 'goal-b',
      title: 'Account B, offline',
      updatedAt: new Date().toISOString(),
    },
  ]
  await settle()
  check(
    'the next account starts its own queue',
    laptop.engine.status.value.queued === 1 &&
      laptop.engine.outbox.pending.every(
        (mutation) => mutation.rowId === 'goal-b',
      ),
    laptop.engine.outbox.pending,
  )

  laptop.online.value = true
  await laptop.engine.sync()
  check(
    'the local rows still reach the server through the merge',
    serverHas(server, SYNC_TABLE.GOALS, 'goal-a') &&
      serverHas(server, SYNC_TABLE.GOALS, 'goal-b'),
  )
}

async function verifyActiveTimer() {
  section('The running timer follows you between devices')

  const server = createFakeServer()
  const laptop = createDevice('laptop', server, 'user-timer')
  const phone = createDevice('phone', server, 'user-timer')
  await laptop.engine.sync()
  await phone.engine.sync()

  const startedAt = Date.now()
  laptop.timer.value = [
    {
      id: 'active-timer',
      sessionId: 'session-1',
      mode: 'stopwatch',
      status: TIMER_STATUS.RUNNING,
      startedAt,
      accumulatedMs: 0,
      completedFocusCount: 0,
      closedSessionId: '',
      updatedAt: new Date().toISOString(),
    },
  ]
  await settle()
  await phone.engine.sync()
  check(
    'a timer started on the laptop is running on the phone',
    phone.timer.value[0]?.status === TIMER_STATUS.RUNNING &&
      phone.timer.value[0]?.startedAt === startedAt,
    phone.timer.value,
  )

  await new Promise((resolve) => setTimeout(resolve, 2))
  phone.timer.value = [
    {
      ...phone.timer.value[0],
      status: TIMER_STATUS.PAUSED,
      startedAt: null,
      accumulatedMs: 1000,
      updatedAt: new Date().toISOString(),
    },
  ]
  await settle()
  await laptop.engine.sync()
  check(
    'pausing on the phone pauses it on the laptop',
    laptop.timer.value[0]?.status === TIMER_STATUS.PAUSED,
    laptop.timer.value,
  )

  const tablet = createDevice('tablet', server, 'user-timer')
  tablet.timer.value = [
    {
      id: 'active-timer',
      ...createIdleTimer(),
      closedSessionId: '',
    },
  ]
  await settle()
  await tablet.engine.sync()
  check(
    "a fresh device's idle timer does not stop the paused one",
    tablet.timer.value[0]?.status === TIMER_STATUS.PAUSED &&
      serverRow(server, SYNC_TABLE.ACTIVE_TIMER, 'active-timer')?.status ===
        TIMER_STATUS.PAUSED,
    tablet.timer.value,
  )

  section('Who records a sitting when devices disagree')

  const running = {
    ...createIdleTimer(),
    sessionId: 'mine',
    status: TIMER_STATUS.RUNNING,
    startedAt: Date.now(),
  }
  check(
    'the other device carrying on with the same sitting: nothing to record',
    !mustRecordBeforeAdopting(
      running,
      { ...running, status: TIMER_STATUS.PAUSED },
      '',
    ),
  )
  check(
    'the other device stopped this sitting: it already recorded it',
    !mustRecordBeforeAdopting(running, createIdleTimer(), 'mine'),
  )
  check(
    'the other device started a rival sitting: record ours first',
    mustRecordBeforeAdopting(running, { ...running, sessionId: 'theirs' }, ''),
  )
  check(
    'nothing running here: just adopt',
    !mustRecordBeforeAdopting(
      createIdleTimer(),
      { ...running, sessionId: 'theirs' },
      '',
    ),
  )

  section('A countdown that ran out on both devices')

  const stretch = {
    id: 'entry-session-2-1700000000000',
    sessionId: 'session-2',
    startedAt: new Date(1_700_000_000_000).toISOString(),
    endedAt: new Date(1_700_001_500_000).toISOString(),
    mode: 'countdown',
    source: 'timer',
  }
  laptop.entries.value = [
    ...laptop.entries.value,
    { ...stretch, updatedAt: new Date().toISOString() },
  ]
  phone.entries.value = [
    ...phone.entries.value,
    { ...stretch, updatedAt: new Date().toISOString() },
  ]
  await settle()
  await laptop.engine.sync()
  await phone.engine.sync()
  await laptop.engine.sync()
  const copies = (list: SyncedRow[]) =>
    list.filter((row) => row.id === stretch.id).length
  check(
    'it is recorded once, not twice',
    serverCount(server, SYNC_TABLE.TIME_ENTRIES) === 1 &&
      copies(laptop.entries.value) === 1 &&
      copies(phone.entries.value) === 1,
    { server: serverCount(server, SYNC_TABLE.TIME_ENTRIES) },
  )
}

async function verifySnapshotRetention() {
  section('Snapshot retention')

  const backend = createMemorySnapshotBackend()
  const store = createSnapshotStore(backend)

  for (let index = 0; index < 5; index += 1) {
    await store.save(`run ${index}`, { index })
    // Ids are timestamp based, so each needs its own millisecond.
    await new Promise((resolve) => setTimeout(resolve, 2))
  }

  const kept = await store.list()
  check('only three snapshots are kept', kept.length === 3, kept.length)
  check(
    'the newest is first',
    (kept[0].payload as { index: number }).index === 4,
  )
  check(
    'the oldest two were dropped',
    (kept[2].payload as { index: number }).index === 2,
  )
}

function verifyQuickAdd() {
  section('Quick add parsing')

  const goals = [
    { id: 'g-workshop', title: 'Workshop' },
    { id: 'g-work', title: 'Work' },
    { id: 'g-home', title: 'Home stuff' },
  ]
  const today = '2026-10-12'

  const milk = parseQuickAdd('Купити молоко #work завтра', { goals, today })
  check(
    'the title keeps only the words that were not tokens',
    milk.title === 'Купити молоко',
    milk.title,
  )
  check('#name picks the project', milk.goalId === 'g-work', milk.goalId)
  check('the project title comes back for the chip', milk.goalTitle === 'Work')
  check(
    'завтра schedules tomorrow',
    milk.day === 'tomorrow' && milk.date === '2026-10-13',
    milk,
  )

  const exact = parseQuickAdd('plan #WORK', { goals, today })
  check(
    'project names match ignoring case and prefer an exact match',
    exact.goalId === 'g-work',
    exact.goalId,
  )

  const prefix = parseQuickAdd('Call dentist #home', { goals, today })
  check(
    'a prefix of the project name is enough',
    prefix.goalId === 'g-home' && prefix.title === 'Call dentist',
    prefix,
  )

  const unknown = parseQuickAdd('Read #nowhere', { goals, today })
  check(
    'an unknown #name starts a new project',
    unknown.goalId === null &&
      unknown.newGoalTitle === 'nowhere' &&
      unknown.title === 'Read',
    unknown,
  )

  const underscored = parseQuickAdd('Fix tap #мій_дім завтра', { goals, today })
  check(
    'underscores in a new project name become spaces',
    underscored.newGoalTitle === 'мій дім' && underscored.title === 'Fix tap',
    underscored,
  )

  const spaced = parseQuickAdd('Call plumber #home stuff tomorrow', {
    goals,
    today,
  })
  check(
    'a project name with spaces is matched whole',
    spaced.goalId === 'g-home' &&
      spaced.title === 'Call plumber' &&
      spaced.newGoalTitle === null,
    spaced,
  )

  const cyrillic = parseQuickAdd('Помити вікна #ДІМ', {
    goals: [...goals, { id: 'g-dim', title: 'Дім' }],
    today,
  })
  check(
    'Cyrillic project names match ignoring case',
    cyrillic.goalId === 'g-dim' && cyrillic.title === 'Помити вікна',
    cyrillic,
  )

  const todayEn = parseQuickAdd('Pay rent today', { goals, today })
  check(
    'today is read and removed',
    todayEn.title === 'Pay rent' && todayEn.date === today,
    todayEn,
  )

  const todayUk = parseQuickAdd('Зробити звіт сьогодні', { goals, today })
  check(
    'сьогодні is read',
    todayUk.title === 'Зробити звіт' && todayUk.date === today,
    todayUk,
  )

  // Day words of every interface language, in any UI language.
  const dayWordCases: Array<[string, string, string | null]> = [
    ['Zahlen heute', 'today', today],
    ['Zahlen Heute', 'today', today],
    ['Listo dziś', 'today', today],
    ['Pagar hoy', 'today', today],
    ['Pagar Hoy', 'today', today],
    ['Trening dzisiaj', 'today', today],
    ['买牛奶 今天', 'today', today],
    ['Wash the car morgen', 'tomorrow', '2026-10-13'],
    ['Miasto jutro', 'tomorrow', '2026-10-13'],
    ['Pay rent MAÑANA', 'tomorrow', '2026-10-13'],
    ['Pay rent manana', 'tomorrow', '2026-10-13'],
    ['Lunch 明天', 'tomorrow', '2026-10-13'],
    ['明天买牛奶', 'tomorrow', '2026-10-13'],
    ['买牛奶明天', 'tomorrow', '2026-10-13'],
  ]
  for (const [text, day, expected] of dayWordCases) {
    const parsed = parseQuickAdd(text, { goals, today })
    check(
      `"${text}" reads as ${day}`,
      parsed.day === day && parsed.date === expected,
      parsed,
    )
  }

  const morgenRoutine = parseQuickAdd('Morgenroutine', { goals, today })
  check(
    'a title that only contains a day word is not a date',
    morgenRoutine.day === null &&
      morgenRoutine.date === null &&
      morgenRoutine.title === 'Morgenroutine',
    morgenRoutine,
  )

  const chineseNoun = parseQuickAdd('明天的计划', { goals, today })
  check(
    'a noun phrase with 明天 at its start stays the title',
    chineseNoun.day === null && chineseNoun.title === '明天的计划',
    chineseNoun,
  )

  const bang = parseQuickAdd('Wow! not a priority', { goals, today })
  check(
    'a ! glued to a word is part of the title',
    bang.title === 'Wow! not a priority',
    bang,
  )

  const alone = parseQuickAdd('Call mom !', { goals, today })
  check(
    'a lone ! stays in the title, it is not a priority',
    alone.title === 'Call mom !' &&
      alone.goalId === null &&
      alone.date === null,
    alone,
  )

  const dated = parseQuickAdd('Dentist 25.10.2026 #work', { goals, today })
  check(
    'a written date d.m.yyyy schedules that day',
    dated.date === '2026-10-25' &&
      dated.day === 'date' &&
      dated.title === 'Dentist',
    dated,
  )

  const isoDate = parseQuickAdd('Renew passport 2027-01-05', { goals, today })
  check(
    'an ISO date is read',
    isoDate.date === '2027-01-05' && isoDate.title === 'Renew passport',
    isoDate,
  )

  const slashed = parseQuickAdd('Pay tax 5/11/26', { goals, today })
  check(
    'd/m/yy with a short year is read',
    slashed.date === '2026-11-05',
    slashed.date,
  )

  const noYear = parseQuickAdd('Birthday 01.03', { goals, today })
  check(
    'a date without a year that has passed means next year',
    noYear.date === '2027-03-01',
    noYear.date,
  )

  const noYearAhead = parseQuickAdd('Party 31.12', { goals, today })
  check(
    'a date without a year still ahead stays this year',
    noYearAhead.date === '2026-12-31',
    noYearAhead.date,
  )

  const impossible = parseQuickAdd('Odd 31.02.2026', { goals, today })
  check(
    'an impossible date stays in the title',
    impossible.date === null && impossible.title === 'Odd 31.02.2026',
    impossible,
  )

  const version = parseQuickAdd('Release v1.2 notes', { goals, today })
  check(
    'version numbers are not dates',
    version.date === null && version.title === 'Release v1.2 notes',
    version,
  )

  const wrap = parseQuickAdd('ship it tomorrow', { goals, today: '2026-10-31' })
  check(
    'tomorrow crosses the month boundary',
    wrap.date === '2026-11-01',
    wrap.date,
  )

  const onlyProject = parseQuickAdd('  #work   ', { goals, today })
  check(
    'a line with only a project has no title to add',
    onlyProject.title === '' && onlyProject.goalId === 'g-work',
    onlyProject,
  )

  const empty = parseQuickAdd('', { goals, today })
  check(
    'an empty line parses to nothing',
    empty.title === '' && empty.goalId === null && empty.date === null,
    empty,
  )

  const proto = parseQuickAdd('constructor', { goals, today })
  check(
    'plain words that name object properties stay plain',
    proto.title === 'constructor' && proto.date === null,
    proto,
  )
}

async function main() {
  verifyTombstones()
  verifyDirtyCheck()
  await verifyOutbox()
  verifyMerge()
  await verifyHealingFilter()
  verifyLateArrivalAfterDelete()
  verifyCarryForward()
  await verifyTwoDevices()
  await verifyFieldGroupsAcrossDevices()
  await verifyEverydayRoutine()
  await verifyAccountSwitch()
  await verifyActiveTimer()
  await verifySnapshotRetention()
  verifyQuickAdd()

  console.log(`\n${checks - failures}/${checks} checks passed`)
  if (failures > 0) {
    console.log(`${failures} FAILED`)
    process.exitCode = 1
  }
}

void main()
