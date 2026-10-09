import { computed } from 'vue'
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

  const stateLabel = computed(() => {
    switch (status.value.state) {
      case 'off':
        return 'Not syncing'
      case 'syncing':
        return 'Saving…'
      case 'offline':
        return 'Offline'
      case 'error':
        return 'Needs a look'
      default:
        return 'Up to date'
    }
  })

  const lastSynced = computed(() => {
    const at = status.value.lastSyncedAt
    if (!at) return 'not yet'
    return new Date(at).toLocaleString(locale.value, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: uses12Hour.value,
    })
  })

  const failures = computed(() => {
    void status.value.deadLettered
    return sync.deadLetters()
  })

  const triggerTitle = computed(() => {
    if (!auth.isSignedIn.value) return 'Profile · signed out'
    return `${auth.displayName.value} · ${stateLabel.value}`
  })

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
    stateLabel,
    lastSynced,
    failures,
    triggerTitle,
    signIn,
    signOut,
    retryDead: sync.retryDead,
    discardDead: sync.discardDead,
  }
}
