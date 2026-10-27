import { ref, watch } from 'vue'
import { getSupabase } from '../lib/supabaseClient'
import {
  createSyncEngine,
  type SyncCollection,
  type SyncMeta,
} from '../sync/engine'
import { createSupabaseTransport } from '../sync/supabaseTransport'
import {
  createSnapshotStore,
  indexedDbSnapshotBackend,
  type SnapshotStore,
} from '../sync/snapshots'
import { readJson, writeJson } from '../lib/storage'
import type { OutboxState } from '../sync/outbox'
import {
  SYNC_TABLES,
  type AppliedRecord,
  type SyncTransport,
} from '../sync/types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from './useAuth'
import { useTombstones } from './useTombstones'
import { reportError } from '../lib/errorReporter'
import { createSettingsCollection } from './settingsSync'
import { createTimerCollection } from './timerSync'

const OUTBOX_STORAGE_KEY = 'dayforge-sync-outbox-v1'
const META_STORAGE_KEY = 'dayforge-sync-meta-v1'
const RING_LOG_STORAGE_KEY = 'dayforge-sync-log-v1'
const PERIODIC_PULL_MS = 30_000
const HIDDEN_PULL_MS = 120_000
const REALTIME_DEBOUNCE_MS = 1_500
const REALTIME_TABLES = [...SYNC_TABLES, 'deletions']

const snapshots: SnapshotStore = createSnapshotStore(indexedDbSnapshotBackend)

let transport: SyncTransport | null = null
let buildBackup: () => unknown = () => null
let initialized = false
let channel: RealtimeChannel | null = null
let realtimeTimer: number | undefined
let lastAutoSyncAt = 0
/** Set for the rest of this page's life once the account is being deleted. */
let stopped = false

function currentUserId(): string | null {
  return useAuth().user.value?.id ?? null
}

/** Built once a session exists, and thrown away when it goes. */
function currentTransport(): SyncTransport | null {
  const client = getSupabase()
  if (!client || stopped || currentUserId() === null) return null
  if (!transport) {
    transport = createSupabaseTransport({ client, userId: currentUserId })
  }
  return transport
}

/**
 * Reactive on purpose. `navigator.onLine` read directly tells the truth once
 * and then never again, so the status the sidebar shows would have gone stale
 * the moment the connection did — which is exactly when it matters.
 */
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

const tombstoneStore = useTombstones()

const engine = createSyncEngine({
  transport: currentTransport,
  userId: currentUserId,
  now: () => Date.now(),
  setTimer: (fn, ms) => window.setTimeout(fn, ms),
  clearTimer: (handle) => window.clearTimeout(handle as number),
  isOnline: () => online.value,
  isSignedOut: () => useAuth().isReady.value && useAuth().user.value === null,
  snapshots,
  buildBackup: () => buildBackup(),
  tombstones: {
    all: () => tombstoneStore.tombstones.value,
    merge: tombstoneStore.merge,
    sweep: tombstoneStore.sweep,
  },
  outboxPersistence: {
    read: () => readJson<OutboxState | null>(OUTBOX_STORAGE_KEY, null),
    write: (state) => writeJson(OUTBOX_STORAGE_KEY, state),
  },
  metaPersistence: {
    read: () => readJson<SyncMeta | null>(META_STORAGE_KEY, null),
    write: (meta) => writeJson(META_STORAGE_KEY, meta),
  },
  onError: (error, stage) => reportError(error, { area: 'sync', stage }),
  ringLogPersistence: {
    read: () => readJson<AppliedRecord[] | null>(RING_LOG_STORAGE_KEY, null),
    write: (records) => writeJson(RING_LOG_STORAGE_KEY, records),
  },
})

function attachListeners() {
  if (typeof window === 'undefined') return

  // Coming back online is the moment a queue that has been waiting can move.
  window.addEventListener('online', () => {
    online.value = true
    void engine.sync()
  })

  // Losing it is only worth noting, so the count of what is waiting can show.
  window.addEventListener('offline', () => {
    online.value = false
  })

  // Returning to the app is when another device's work is worth asking for.
  // The same two events already wake the timer up, for the same reason.
  const resume = () => {
    if (document.hidden) return
    void engine.sync()
  }
  document.addEventListener('visibilitychange', resume)
  window.addEventListener('focus', resume)

  window.setInterval(() => {
    if (!online.value) return
    const now = Date.now()
    const gap = document.hidden ? HIDDEN_PULL_MS : PERIODIC_PULL_MS
    if (now - lastAutoSyncAt < gap - 1_000) return
    lastAutoSyncAt = now
    void engine.sync()
  }, PERIODIC_PULL_MS)

  // A last chance to get the queue out before the tab goes.
  window.addEventListener('beforeunload', () => {
    void engine.flush()
  })
}

function scheduleRealtimeSync() {
  if (realtimeTimer !== undefined) window.clearTimeout(realtimeTimer)
  realtimeTimer = window.setTimeout(() => {
    realtimeTimer = undefined
    lastAutoSyncAt = Date.now()
    void engine.sync()
  }, REALTIME_DEBOUNCE_MS)
}

function unsubscribeRealtime() {
  const client = getSupabase()
  if (channel && client) void client.removeChannel(channel)
  channel = null
}

function subscribeRealtime(userId: string) {
  unsubscribeRealtime()
  const client = getSupabase()
  if (!client) return

  const next = client.channel(`dayforge-sync-${userId}`)
  REALTIME_TABLES.forEach((table) => {
    next.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
      scheduleRealtimeSync,
    )
  })
  next.subscribe((state) => {
    if (state === 'SUBSCRIBED') scheduleRealtimeSync()
  })
  channel = next
}

function watchSession() {
  watch(
    () => useAuth().user.value?.id ?? null,
    (userId, previous) => {
      if (userId === previous) return

      if (userId === null) {
        transport = null
        unsubscribeRealtime()
        engine.onSignedOut()
        return
      }

      // A fresh session needs a transport bound to it before anything is sent.
      transport = null
      void engine.onSignedIn()
      subscribeRealtime(userId)
    },
    { immediate: true },
  )
}

/**
 * Sync as the app sees it: register the arrays once and nothing else is needed.
 * Everything after that happens on its own — there is no button, and there is
 * nothing for anyone to remember to press.
 */
export function useSync() {
  function register(collections: SyncCollection[], backup: () => unknown) {
    buildBackup = backup
    engine.register([
      ...collections,
      createSettingsCollection(),
      createTimerCollection(),
    ])

    if (initialized) return
    initialized = true
    attachListeners()
    watchSession()
  }

  /**
   * Stops every path that could send or pull for this page: timers, the live
   * channel, the outbox, and any later trigger. Used just before an account is
   * deleted, so nothing re-creates rows the server has just removed.
   */
  function stopSync() {
    stopped = true
    if (realtimeTimer !== undefined) window.clearTimeout(realtimeTimer)
    realtimeTimer = undefined
    unsubscribeRealtime()
    engine.onSignedOut()
  }

  return {
    register,
    status: engine.status,
    retryDead: engine.retryDead,
    discardDead: engine.discardDead,
    deadLetters: () => engine.outbox.dead,
    log: () => engine.log.entries,
    snapshots,
    isOnline: online,
    stopSync,
  }
}
