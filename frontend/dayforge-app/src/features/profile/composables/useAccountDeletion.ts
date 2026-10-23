import { computed, ref } from 'vue'
import { getSupabase } from '../../../lib/supabaseClient'
import { reportError } from '../../../lib/errorReporter'
import { useAuth } from '../../../composables/useAuth'
import { useSync } from '../../../composables/useSync'
import { useUndoToast } from '../../../composables/useUndoToast'
import {
  ACCOUNT_DELETED_NOTICE_KEY,
  clearLocalAppData,
} from '../../../sync/accountDeletion'

/**
 * Deletes the signed-in account and everything it holds on the server, then
 * wipes this device. The server call comes first and nothing local changes
 * unless it succeeds, so a failure leaves the user exactly where they were.
 */
export function useAccountDeletion() {
  const auth = useAuth()
  const sync = useSync()

  const isBusy = ref(false)
  const error = ref<string | null>(null)

  const isOnline = sync.isOnline
  const offlineHint = 'Connect to the internet to delete your account.'
  const canStart = computed(() => auth.isSignedIn.value && isOnline.value)

  async function deleteAccount(): Promise<boolean> {
    const client = getSupabase()
    if (!client || !auth.isSignedIn.value) {
      error.value = 'You are not signed in.'
      return false
    }
    if (!isOnline.value) {
      error.value = offlineHint
      return false
    }

    isBusy.value = true
    error.value = null

    try {
      const { error: rpcError } = await client.rpc('delete_my_account')
      if (rpcError) throw new Error(rpcError.message)
    } catch (caught) {
      isBusy.value = false
      reportError(caught, { area: 'sync', stage: 'account-delete' })
      const detail = caught instanceof Error ? caught.message : String(caught)
      error.value = `Your account was not deleted (${detail}). Nothing was changed, so you can try again.`
      return false
    }

    // The server has erased the account. From here on nothing may send or
    // pull, and the local copy goes too.
    sync.stopSync()
    try {
      await client.auth.signOut({ scope: 'local' })
    } catch {
      // The session is dropped with the wipe below either way.
    }
    await sync.snapshots.clear()

    try {
      sessionStorage.setItem(ACCOUNT_DELETED_NOTICE_KEY, 'true')
    } catch {
      // Without it the page just reloads without the notice.
    }

    clearLocalAppData(window.localStorage)
    // A reload drops every in-memory copy of the deleted data, so nothing can
    // write it back.
    window.location.reload()
    return true
  }

  return {
    isBusy,
    error,
    isOnline,
    offlineHint,
    canStart,
    deleteAccount,
  }
}

/**
 * Shown once, on the first load after a deletion. The notice is only offered
 * here, so the page can tell the user without any server state.
 */
export function showAccountDeletedNotice(): void {
  let pending = false
  try {
    pending = sessionStorage.getItem(ACCOUNT_DELETED_NOTICE_KEY) !== null
    sessionStorage.removeItem(ACCOUNT_DELETED_NOTICE_KEY)
  } catch {
    return
  }
  if (!pending) return

  const { offerNotice } = useUndoToast()
  offerNotice('Your account was deleted', 'OK', () => {})
}
