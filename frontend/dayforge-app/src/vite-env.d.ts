/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Sentry DSN. Unset means no error reporting. */
  readonly VITE_SENTRY_DSN?: string
  /** Shown as the Sentry release, for example 1.4.0 or a commit SHA. */
  readonly VITE_APP_VERSION?: string
  /** Web Push application server key (base64url, raw P-256). Unset hides push reminders. */
  readonly VITE_VAPID_PUBLIC_KEY?: string
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // The standard Vue shim: any component's props and emits are allowed here.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  const component: DefineComponent<{}, {}, any>
  export default component
}
