/*
  DayForge service worker: offline app shell, nothing else.

  - Precaches index.html on install.
  - Navigations: network-first, falling back to the cached shell when offline.
  - Same-origin /assets/* (content-hashed, immutable): cache-first.
  - Everything else (non-GET, cross-origin such as Supabase/Google, OAuth
    callback URLs, /auth/ paths) is never intercepted.

  - Push: shows the reminder sent by the push-reminders Edge Function. The
    payload carries the same `tag` the open app uses for its own browser
    notifications, so the two replace each other rather than stacking.
  - notificationclick: focuses an open DayForge window, or opens one.

  Bump CACHE_VERSION whenever this file's caching logic changes. Old caches
  are removed on activate.

  No skipWaiting(): a new worker waits until all tabs are closed, so an
  open session is never switched to new assets mid-flight. It takes over on
  the next load.
*/

const CACHE_VERSION = 'v2'
const CACHE_PREFIX = 'dayforge-shell-'
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`
const SHELL_URL = '/index.html'
const SHELL_ALIASES = ['/index.html', '/']

// Copy a response into a fresh Response so it is not flagged as redirected
// (Safari refuses redirected responses for navigations) and is safe to store.
function toPlainResponse(response) {
  return response.blob().then(
    (body) =>
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const response = await fetch(SHELL_URL, { cache: 'reload' })
      if (!response.ok) {
        throw new Error(`Shell precache failed: ${response.status}`)
      }
      const shell = await toPlainResponse(response)
      await cache.put(SHELL_URL, shell.clone())
      await cache.put('/', shell)
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

// OAuth redirects and token hand-offs must always reach the network and the
// page untouched; never serve or cache them.
function isAuthRelated(url) {
  if (url.pathname.startsWith('/auth/')) return true
  return /code=|access_token|error=/.test(url.search + url.hash)
}

async function handleNavigation(event) {
  const { request } = event
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok && !response.redirected) {
      // Keep the cached shell fresh so the next offline start uses the
      // latest index.html (which references the current hashed assets).
      event.waitUntil(
        toPlainResponse(response.clone()).then((copy) =>
          cache.put(SHELL_URL, copy),
        ),
      )
    }
    return response
  } catch {
    for (const alias of SHELL_ALIASES) {
      const cached = await cache.match(alias)
      if (cached) return cached
    }
    return Response.error()
  }
}

async function handleAsset(event) {
  const { request } = event
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok && response.type === 'basic') {
    event.waitUntil(cache.put(request, response.clone()))
  }
  return response
}

const NOTIFICATION_ICON = '/logo-192.png'

function readPushPayload(event) {
  if (!event.data) return {}
  try {
    return event.data.json()
  } catch {
    return { body: event.data.text() }
  }
}

// Only same-origin paths are opened from a notification.
function safeTargetUrl(value) {
  try {
    const target = new URL(typeof value === 'string' ? value : '/', self.location.origin)
    return target.origin === self.location.origin ? target.href : self.location.origin + '/'
  } catch {
    return self.location.origin + '/'
  }
}

self.addEventListener('push', (event) => {
  const data = readPushPayload(event)
  const url = safeTargetUrl(data.url)
  const options = {
    body: typeof data.body === 'string' ? data.body : '',
    tag: typeof data.tag === 'string' ? data.tag : undefined,
    // Same tag replaces silently: no second sound for a reminder already shown.
    renotify: false,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    data: { url },
  }
  if (Array.isArray(data.actions)) options.actions = data.actions.slice(0, 2)

  // Every push must show a notification, or the browser may stop delivering.
  event.waitUntil(
    self.registration.showNotification(
      typeof data.title === 'string' && data.title ? data.title : 'DayForge',
      options,
    ),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = safeTargetUrl(event.notification.data && event.notification.data.url)

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isAuthRelated(url)) return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(handleAsset(event))
  }
})
