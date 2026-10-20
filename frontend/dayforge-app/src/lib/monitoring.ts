/**
 * Sentry error reporting. Loaded with a dynamic import from main.ts, only in a
 * production build that has a DSN, so nothing here reaches the main chunk.
 *
 * Privacy rules this file enforces (see public/privacy.html):
 * - errors only: no tracing, no session replay, no PII;
 * - no request bodies, cookies, headers or query strings leave the device;
 * - console breadcrumbs are dropped, and other breadcrumbs keep only their
 *   category, type and sanitised navigation or request URLs;
 * - component props are not attached to Vue errors;
 * - the user is tagged only with a one-way hash of the Supabase user id.
 */
import * as Sentry from '@sentry/vue'
import type { App } from 'vue'
import { watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { setErrorSink, type ReportedError } from './errorReporter'

type ScrubbableEvent = Sentry.ErrorEvent
type ScrubbableBreadcrumb = Sentry.Breadcrumb

const KEPT_DATA_KEYS = ['method', 'status_code', 'reason', 'type'] as const
const URL_KEYS = ['url', 'from', 'to'] as const
const HAS_QUERY_OR_HASH = /(https?:\/\/[^\s'"<>?#]+)[?#][^\s'"<>]*/gi

/** Origin and path only: no query string, no hash, no credentials. */
export function stripUrl(raw: string): string {
  try {
    const url = new URL(raw, window.location.origin)
    return `${url.origin}${url.pathname}`
  } catch {
    return '[unparsed-url]'
  }
}

/** Free text (messages, frame names) can carry a URL; cut its query and hash. */
function scrubText(text: string): string {
  return text.replace(HAS_QUERY_OR_HASH, '$1')
}

function scrubBreadcrumb(
  breadcrumb: ScrubbableBreadcrumb,
): ScrubbableBreadcrumb | null {
  if (breadcrumb.category?.startsWith('console')) return null

  const { message: _message, data, ...rest } = breadcrumb
  const safe: ScrubbableBreadcrumb = rest
  if (data) {
    const kept: Record<string, unknown> = {}
    for (const key of KEPT_DATA_KEYS) {
      if (key in data) kept[key] = data[key]
    }
    for (const key of URL_KEYS) {
      const value = data[key]
      if (typeof value === 'string') kept[key] = stripUrl(value)
    }
    safe.data = kept
  }
  return safe
}

function scrubEvent(event: ScrubbableEvent): ScrubbableEvent {
  if (event.request) {
    if (event.request.url) event.request.url = stripUrl(event.request.url)
    delete event.request.data
    delete event.request.cookies
    delete event.request.headers
    delete event.request.query_string
    delete event.request.env
  }

  if (event.transaction) event.transaction = scrubText(event.transaction)
  if (event.message && typeof event.message === 'string') {
    event.message = scrubText(event.message)
  }

  delete event.extra
  if (event.contexts) delete event.contexts.vue

  // Only the hashed id may identify anyone; no email, name or IP.
  event.user = event.user?.id ? { id: event.user.id } : undefined

  for (const value of event.exception?.values ?? []) {
    if (value.value) value.value = scrubText(value.value)
    for (const frame of value.stacktrace?.frames ?? []) {
      if (frame.filename) frame.filename = stripUrl(frame.filename)
      if (frame.abs_path) frame.abs_path = stripUrl(frame.abs_path)
    }
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((b): b is ScrubbableBreadcrumb => b !== null)
  }

  return event
}

/** SHA-256 of the user id, first 16 hex chars: stable per account, not reversible. */
async function anonymousUserId(userId: string): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(userId),
    )
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    )
      .join('')
      .slice(0, 16)
  } catch {
    return null
  }
}

function watchUser(): void {
  const { user } = useAuth()
  watch(
    () => user.value?.id ?? null,
    async (userId) => {
      if (userId === null) {
        Sentry.setUser(null)
        return
      }
      const anonId = await anonymousUserId(userId)
      Sentry.setUser(anonId ? { id: anonId } : null)
    },
    { immediate: true },
  )
}

export function initMonitoring(app: App): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return

  const release = import.meta.env.VITE_APP_VERSION as string | undefined

  Sentry.init({
    app,
    dsn,
    environment: import.meta.env.MODE,
    release: release || undefined,
    // No default PII: 11.4 has no sendDefaultPii option, and scrubEvent
    // below reduces the user to the hashed id, which is the only identity sent.
    tracesSampleRate: 0,
    attachProps: false,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  })

  setErrorSink(({ error, tags }: ReportedError) => {
    Sentry.captureException(error, { tags })
  })

  watchUser()
}
