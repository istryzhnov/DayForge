import { computed, ref } from 'vue'
import { useAuth } from '../../../composables/useAuth'
import { useSync } from '../../../composables/useSync'
import { useFormat } from '../../../composables/useFormat'
import { clearAccountData } from '../../../sync/accountDeletion'

export function useProfile() {
  const auth = useAuth()
  const sync = useSync()
  const { locale, uses12Hour } = useFormat()

  const status = sync.status

  const initial = computed(() => {
    const source = auth.user.value?.name ?? auth.user.value?.email ?? ''
    return source.trim().charAt(0).toUpperCase() || '?'
  })

  const avatarUrl = computed(() => auth.user.value?.avatarUrl ?? null)

  const lastSynced = computed(() => {
    const at = status.value.lastSyncedAt
    if (!at) return null
    return new Date(at).toLocaleString(locale.value, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: uses12Hour.value,
    })
  })

  const syncSummary = computed(() => {
    const { state, queued, deadLettered } = status.value
    switch (state) {
      case 'off':
        return 'Not syncing'
      case 'syncing':
        return 'Syncing…'
      case 'offline':
        if (queued === 0) return 'Offline'
        return `Offline · ${queued} ${queued === 1 ? 'change' : 'changes'} waiting`
      case 'error':
        return `Sync error · ${deadLettered} refused`
      default:
        return lastSynced.value ? `Synced · ${lastSynced.value}` : 'Synced'
    }
  })

  const failures = computed(() => {
    void status.value.deadLettered
    return sync.deadLetters()
  })

  const triggerTitle = computed(() => {
    if (!auth.isSignedIn.value) return 'Profile · signed out'
    return `${auth.displayName.value} · ${syncSummary.value}`
  })

  const logCopied = ref(false)
  let logCopiedResetId: number | undefined

  async function copyLog() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(sync.log(), null, 2))
    } catch {
      return
    }

    logCopied.value = true
    window.clearTimeout(logCopiedResetId)
    logCopiedResetId = window.setTimeout(() => {
      logCopied.value = false
    }, 2000)
  }

  async function signIn() {
    await auth.signInWithGoogle()
  }

  // How long sign-out waits for queued changes to reach the server.
  const SIGN_OUT_FLUSH_MS = 8000

  const isSigningOut = ref(false)
  const isSignOutConfirmOpen = ref(false)
  const unsyncedCount = ref(0)

  /**
   * Sending queued changes first means signing out usually loses nothing. If
   * some could not be sent (offline, or the server refused them), the user is
   * asked before they are removed from this browser.
   */
  async function signOut() {
    if (isSigningOut.value) return
    isSigningOut.value = true
    try {
      await sync.flushPending(SIGN_OUT_FLUSH_MS)
      // Refused changes are unsent too, and go with the wipe just the same.
      const left = sync.pendingCount() + sync.deadLetters().length
      if (left > 0) {
        unsyncedCount.value = left
        isSignOutConfirmOpen.value = true
        return
      }
      await finishSignOut()
    } finally {
      isSigningOut.value = false
    }
  }

  async function confirmSignOut() {
    if (isSigningOut.value) return
    isSignOutConfirmOpen.value = false
    isSigningOut.value = true
    try {
      await finishSignOut()
    } finally {
      isSigningOut.value = false
    }
  }

  function cancelSignOut() {
    isSignOutConfirmOpen.value = false
  }

  /**
   * Ends the session, stops every sync path, then removes this account's data
   * and reloads. The reload drops every in-memory copy, so nothing can write
   * the data back.
   */
  async function finishSignOut() {
    await auth.signOut()
    sync.stopSync()
    await sync.snapshots.clear()
    clearAccountData(window.localStorage)
    window.location.reload()
  }

  return {
    auth,
    status,
    initial,
    avatarUrl,
    syncSummary,
    failures,
    triggerTitle,
    signIn,
    signOut,
    isSigningOut,
    isSignOutConfirmOpen,
    unsyncedCount,
    confirmSignOut,
    cancelSignOut,
    copyLog,
    logCopied,
    retryDead: sync.retryDead,
    discardDead: sync.discardDead,
  }
}
