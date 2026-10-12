import { computed, ref } from 'vue'
import { useAuth } from '../../../composables/useAuth'
import { useSync } from '../../../composables/useSync'
import { useFormat } from '../../../composables/useFormat'

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

  async function signOut() {
    await auth.signOut()
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
    copyLog,
    logCopied,
    retryDead: sync.retryDead,
    discardDead: sync.discardDead,
  }
}
