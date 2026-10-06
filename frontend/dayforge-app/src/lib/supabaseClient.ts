import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Sync is configured, not compiled in: with no keys the app is exactly what it
 * was before an account existed, and nothing anywhere may throw because of it.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSyncConfigured = Boolean(url && anonKey)

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSyncConfigured) return null
  if (client) return client

  client = createClient(url as string, anonKey as string, {
    auth: {
      // The session is kept so a reload does not ask for Google again.
      persistSession: true,
      autoRefreshToken: true,
      // There is no router: the tokens arrive in the URL and are cleared from
      // it here, leaving the single page exactly where it started.
      detectSessionInUrl: true,
      storageKey: 'dayforge-auth-v1',
    },
  })

  return client
}

export type { SupabaseClient }
