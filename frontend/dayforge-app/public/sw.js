/*
  DayForge service worker: offline app shell, nothing else.

  - Precaches index.html on install.
  - Navigations: network-first, falling back to the cached shell when offline.
  - Same-origin /assets/* (content-hashed, immutable): cache-first.
  - Everything else (non-GET, cross-origin such as Supabase/Google, OAuth
    callback URLs, /auth/ paths) is never intercepted.

  Bump CACHE_VERSION whenever this file's caching logic changes. Old caches
  are removed on activate.

  No skipWaiting(): a new worker waits until all tabs are closed, so an
  open session is never switched to new assets mid-flight. It takes over on
  the next load.
*/

const CACHE_VERSION = 'v1'
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
