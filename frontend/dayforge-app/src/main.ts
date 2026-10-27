import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

const RELOAD_FLAG = 'dayforge-chunk-reload'

// After a deploy, a tab still running the old build asks for chunk files that
// no longer exist. One reload picks up the new build; the flag stops a loop.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return
    sessionStorage.setItem(RELOAD_FLAG, '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

const app = createApp(App)
app.mount('#app')

window.setTimeout(() => {
  try {
    sessionStorage.removeItem(RELOAD_FLAG)
  } catch {
    // Storage blocked: the guard simply never arms.
  }
}, 10_000)

// Error reporting is production-only and opt-in by DSN. Loaded after mount so
// the SDK never delays the first paint, and kept out of the main chunk.
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  void import('./lib/monitoring').then(({ initMonitoring }) =>
    initMonitoring(app),
  )
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.warn('Service worker registration failed', error)
    })
  })
}
