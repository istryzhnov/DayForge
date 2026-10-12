import { computed, ref } from 'vue'
import { getSupabase, isSyncConfigured } from '../lib/supabaseClient'

export interface AuthUser {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
}

const user = ref<AuthUser | null>(null)
const isReady = ref(false)
const isBusy = ref(false)
const error = ref<string | null>(null)

let initialized = false

function readUser(raw: unknown): AuthUser | null {
  if (typeof raw !== 'object' || raw === null) return null
  const candidate = raw as {
    id?: unknown
    email?: unknown
    user_metadata?: Record<string, unknown>
  }
  if (typeof candidate.id !== 'string') return null

  const meta = candidate.user_metadata ?? {}
  const name = meta.full_name ?? meta.name
  const avatar = meta.avatar_url ?? meta.picture

  return {
    id: candidate.id,
    email: typeof candidate.email === 'string' ? candidate.email : null,
    name: typeof name === 'string' ? name : null,
    avatarUrl: typeof avatar === 'string' ? avatar : null,
  }
}

function initialize() {
  if (initialized) return
  initialized = true

  const supabase = getSupabase()
  if (!supabase) {
    // No keys: there is nothing to be signed in to, and that is a valid state.
    isReady.value = true
    return
  }

  void supabase.auth
    .getSession()
    .then(({ data }) => {
      user.value = readUser(data.session?.user ?? null)
    })
    .catch(() => {
      // A refused session is simply no session.
    })
    .finally(() => {
      isReady.value = true
    })

  supabase.auth.onAuthStateChange((_event, session) => {
    user.value = readUser(session?.user ?? null)
    isReady.value = true
  })
}

/**
 * The whole app's view of who is signed in. Everything platform-specific stays
 * behind this one surface, so a native shell can swap the implementation
 * without touching a single caller.
 */
export function useAuth() {
  initialize()

  async function signInWithGoogle(): Promise<boolean> {
    const supabase = getSupabase()
    if (!supabase) {
      error.value = 'Sync is not configured on this build.'
      return false
    }

    isBusy.value = true
    error.value = null

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Back to the page it started on; the session is read out of the URL.
          redirectTo: window.location.origin + window.location.pathname,
        },
      })

      if (authError) {
        error.value = authError.message
        return false
      }
      return true
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : String(caught)
      return false
    } finally {
      isBusy.value = false
    }
  }

  /**
   * Signing out leaves the local data alone: the app goes back to being the
   * offline planner it is without an account.
   */
  async function signOut(): Promise<void> {
    const supabase = getSupabase()
    if (!supabase) return

    isBusy.value = true
    try {
      await supabase.auth.signOut()
      user.value = null
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : String(caught)
    } finally {
      isBusy.value = false
    }
  }

  function dismissError() {
    error.value = null
  }

  return {
    user,
    isReady,
    isBusy,
    error,
    isConfigured: isSyncConfigured,
    isSignedIn: computed(() => user.value !== null),
    displayName: computed(
      () => user.value?.name ?? user.value?.email ?? 'Signed in',
    ),
    signInWithGoogle,
    signOut,
    dismissError,
  }
}
