import { ref } from 'vue'
import { i18n } from '../i18n'
import { getSupabase } from '../lib/supabaseClient'

/**
 * Web Push reminders for when DayForge is closed. The server sends them (see
 * supabase/functions/push-reminders); this file only manages this browser's
 * subscription and its row in push_subscriptions.
 */

const VAPID_PUBLIC_KEY = (
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''
).trim()

/** A service worker that is not registered (dev server) never becomes ready. */
const READY_TIMEOUT_MS = 8000

export type PushStatus = 'unavailable' | 'ios-install' | 'off' | 'on' | 'denied'

const status = ref<PushStatus>('off')
const reason = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

function isIosDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/** Running from the Home Screen (iOS) or an installed window (other platforms). */
function isInstalledApp(): boolean {
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  return (navigator as { standalone?: boolean }).standalone === true
}

/** Why push cannot be used here, or null when it can. */
function unsupportedReason(): { status: PushStatus; text: string } | null {
  if (!VAPID_PUBLIC_KEY) {
    return {
      status: 'unavailable',
      text: i18n.global.t('settings.pushNotSetUp'),
    }
  }
  // iOS only delivers push to an app added to the Home Screen, so that is
  // explained before anything else, even where the APIs look present.
  if (isIosDevice() && !isInstalledApp()) {
    return {
      status: 'ios-install',
      text: i18n.global.t('settings.pushIosInstall'),
    }
  }
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return {
      status: 'unavailable',
      text: i18n.global.t('settings.pushUnsupported'),
    }
  }
  return null
}

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (caught: unknown) => {
        window.clearTimeout(timer)
        reject(caught)
      },
    )
  })
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

async function removeRow(endpoint: string) {
  const supabase = getSupabase()
  if (!supabase) return
  // Row-level security limits this delete to the signed-in user's own rows.
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}

/**
 * Brings the state up to date with this browser. A stored time zone that no
 * longer matches the device's (after travel) is re-saved, so quiet hours and
 * "today" follow the user.
 */
async function refreshStatus(userId: string) {
  error.value = null
  const blocked = unsupportedReason()
  if (blocked) {
    status.value = blocked.status
    reason.value = blocked.text
    return
  }
  reason.value = ''

  try {
    const subscription = await currentSubscription()
    if (!subscription) {
      status.value = Notification.permission === 'denied' ? 'denied' : 'off'
      return
    }
    status.value = 'on'

    const supabase = getSupabase()
    if (!supabase) return
    const { data } = await supabase
      .from('push_subscriptions')
      .select('timezone')
      .eq('endpoint', subscription.endpoint)
      .maybeSingle()
    if (data && data.timezone !== browserTimeZone()) {
      await saveRow(userId, subscription)
    }
  } catch {
    // Leave the status as the browser reports it; nothing else depends on this.
  }
}

async function saveRow(userId: string, subscription: PushSubscription) {
  const supabase = getSupabase()
  if (!supabase) throw new Error(i18n.global.t('profile.syncNotConfigured'))

  const json = subscription.toJSON()
  const keys = json.keys ?? {}
  if (!json.endpoint || !keys.p256dh || !keys.auth) {
    throw new Error(i18n.global.t('settings.pushIncomplete'))
  }

  await removeRow(json.endpoint)
  const { error: insertError } = await supabase
    .from('push_subscriptions')
    .insert({
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: navigator.userAgent.slice(0, 300),
      timezone: browserTimeZone(),
    })
  if (insertError) throw new Error(insertError.message)
}

/**
 * Turns reminders on. Must come from a click: the permission prompt is only
 * shown in response to a user gesture.
 */
async function enable(userId: string): Promise<boolean> {
  const blocked = unsupportedReason()
  if (blocked) {
    status.value = blocked.status
    reason.value = blocked.text
    return false
  }

  busy.value = true
  error.value = null
  try {
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
    if (permission !== 'granted') {
      status.value = 'denied'
      error.value = i18n.global.t('settings.pushBlocked')
      return false
    }

    let registration: ServiceWorkerRegistration
    try {
      registration = await withTimeout(
        navigator.serviceWorker.ready,
        READY_TIMEOUT_MS,
      )
    } catch {
      throw new Error(i18n.global.t('settings.pushNotReady'))
    }

    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
      }))

    try {
      await saveRow(userId, subscription)
    } catch (caught) {
      // Do not leave a browser subscription the server does not know about.
      await subscription.unsubscribe().catch(() => false)
      throw caught
    }

    status.value = 'on'
    return true
  } catch (caught) {
    error.value =
      caught instanceof Error
        ? caught.message
        : i18n.global.t('settings.pushOnFailed')
    status.value = Notification.permission === 'denied' ? 'denied' : 'off'
    return false
  } finally {
    busy.value = false
  }
}

async function disable(): Promise<void> {
  busy.value = true
  error.value = null
  try {
    const subscription = await currentSubscription()
    if (subscription) {
      await removeRow(subscription.endpoint)
      await subscription.unsubscribe()
    }
    status.value = Notification.permission === 'denied' ? 'denied' : 'off'
  } catch (caught) {
    error.value =
      caught instanceof Error
        ? caught.message
        : i18n.global.t('settings.pushOffFailed')
  } finally {
    busy.value = false
  }
}

/**
 * Called before sign-out and account deletion, while the session can still
 * delete this browser's row. Never throws: signing out must not hang on it.
 */
export async function releasePushSubscription(): Promise<void> {
  try {
    const subscription = await currentSubscription()
    if (!subscription) return
    await removeRow(subscription.endpoint)
    await subscription.unsubscribe()
  } catch {
    // Best effort: a stale row only costs one failed push later.
  } finally {
    status.value = 'off'
  }
}

export function usePushReminders() {
  return {
    status,
    reason,
    busy,
    error,
    refresh: refreshStatus,
    enable,
    disable,
  }
}
