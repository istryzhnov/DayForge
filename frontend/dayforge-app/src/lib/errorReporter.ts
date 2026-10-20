/**
 * The app-side seam for error reporting. It knows nothing about Sentry: the
 * monitoring module plugs a sink in once it has loaded, and until then every
 * call is a no-op. That keeps the SDK out of the main bundle and out of the
 * sync logic's imports.
 *
 * Nothing that reaches a sink carries payloads. The original error is reduced
 * to its name and, when it is a short plain code, that code. Messages from
 * backend errors can echo row values, so they are never forwarded.
 */

export interface ReportedError {
  error: Error
  tags: Record<string, string>
}

export type ErrorSink = (report: ReportedError) => void

export interface ReportContext {
  area: 'sync'
  stage: string
}

const MIN_INTERVAL_MS = 10 * 60 * 1000
const SAFE_NAME = /^[A-Za-z]{1,40}$/
const SAFE_CODE = /^[A-Za-z0-9_]{1,20}$/

let sink: ErrorSink | null = null
const lastSentAt = new Map<string, number>()

export function setErrorSink(next: ErrorSink | null): void {
  sink = next
}

function sanitize(error: unknown): { name: string; code: string | null } {
  const name =
    error instanceof Error && SAFE_NAME.test(error.name) ? error.name : 'Error'
  const rawCode = (error as { code?: unknown } | null)?.code
  const code =
    typeof rawCode === 'string' && SAFE_CODE.test(rawCode) ? rawCode : null
  return { name, code }
}

/**
 * Reports a failure without its payload. Repeats of the same stage are
 * throttled, so a flaky connection cannot flood the error stream.
 */
export function reportError(error: unknown, context: ReportContext): void {
  if (!sink) return

  const key = `${context.area}:${context.stage}`
  const now = Date.now()
  const last = lastSentAt.get(key)
  if (last !== undefined && now - last < MIN_INTERVAL_MS) return
  lastSentAt.set(key, now)

  try {
    const { name, code } = sanitize(error)
    const reported = new Error(`${context.area} ${context.stage} failed`)
    reported.name = name
    const tags: Record<string, string> = {
      area: context.area,
      stage: context.stage,
    }
    if (code !== null) tags.code = code
    sink({ error: reported, tags })
  } catch {
    // Reporting must never be the thing that fails.
  }
}
