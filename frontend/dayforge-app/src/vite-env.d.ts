/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Sentry DSN. Unset means no error reporting. */
  readonly VITE_SENTRY_DSN?: string
  /** Shown as the Sentry release, for example 1.4.0 or a commit SHA. */
  readonly VITE_APP_VERSION?: string
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
