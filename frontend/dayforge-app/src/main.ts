import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')

// Error reporting is production-only and opt-in by DSN. Loaded after mount so
// the SDK never delays the first paint, and kept out of the main chunk.
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  void import('./lib/monitoring').then(({ initMonitoring }) => initMonitoring(app))
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.warn('Service worker registration failed', error)
    })
  })
}
