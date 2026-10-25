// DayForge: Web Push reminders for when the app is closed.
//
// Called every five minutes by pg_cron through pg_net (see
// supabase/migrations/2026-10-26-web-push.sql). For each user with a push
// subscription it reads the user's settings, running timer, today's tasks and
// time entries, decides which reminders are due with the same rules as the
// app (rules.ts), and sends each one once (push_log is the dedupe table).
//
// Deployed with --no-verify-jwt, so the gateway does not check the caller;
// this function does, below.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2'
import {
  ApplicationServer,
  importVapidKeys,
  PushMessageError,
  Urgency,
} from 'jsr:@negrel/webpush@0.5.0'
import {
  decideReminders,
  type ReminderMessage,
  type ServerEntry,
  type ServerTask,
  type ServerTimer,
} from './rules.ts'

// Untyped on purpose: the rows are read through the shapes in this file.
// deno-lint-ignore no-explicit-any
type Admin = SupabaseClient<any, 'public', any>

const MESSAGE_TTL_SECONDS = 30 * 60
const LOG_RETENTION_MS = 14 * 24 * 60 * 60 * 1000
const ACTIVE_TIMER_ROW = 'active-timer'
const SETTINGS_ROW = 'settings'

interface SubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  timezone: string | null
  created_at: string
  last_used_at: string | null
}

interface RunSummary {
  users: number
  sent: number
  skipped: number
  gone: number
  failed: number
  errors: number
}

// ---- Time zones ------------------------------------------------------------

function zonedParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms))
  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  }
}

/** How far `timeZone` is ahead of UTC at epoch `ms`. */
function zoneOffsetMs(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - (ms - (ms % 1000))
}

/** Epoch ms of a local `YYYY-MM-DD` at `HH:mm` in `timeZone`. */
function localToEpoch(date: string, time: string, timeZone: string): number {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  const naive = Date.UTC(year, month - 1, day, hours, minutes)
  const first = naive - zoneOffsetMs(naive, timeZone)
  return naive - zoneOffsetMs(first, timeZone)
}

function localDate(ms: number, timeZone: string): string {
  const p = zonedParts(ms, timeZone)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

function validTimeZone(value: string | null): string {
  if (!value) return 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return value
  } catch {
    return 'UTC'
  }
}

// ---- Keys and auth ---------------------------------------------------------

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** VAPID keys as web-push generates them: raw public key, raw private `d`. */
async function loadApplicationServer(subject: string) {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set')
  }

  const raw = base64UrlToBytes(publicKey)
  if (raw.length !== 65 || raw[0] !== 4) {
    throw new Error('VAPID_PUBLIC_KEY is not an uncompressed P-256 key')
  }
  const x = bytesToBase64Url(raw.slice(1, 33))
  const y = bytesToBase64Url(raw.slice(33, 65))

  const vapidKeys = await importVapidKeys({
    publicKey: { kty: 'EC', crv: 'P-256', x, y, ext: true, key_ops: ['verify'] },
    privateKey: { kty: 'EC', crv: 'P-256', x, y, d: privateKey, ext: true, key_ops: ['sign'] },
  })

  return ApplicationServer.new({ contactInformation: subject, vapidKeys })
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let difference = 0
  for (let index = 0; index < a.length; index++) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return difference === 0
}

/** The cron job sends the service role key; CRON_SECRET is an alternative. */
function isAuthorized(request: Request): boolean {
  const header = request.headers.get('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return false
  const token = header.slice('Bearer '.length).trim()
  if (!token) return false

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''
  return (
    (serviceKey !== '' && constantTimeEquals(token, serviceKey)) ||
    (cronSecret !== '' && constantTimeEquals(token, cronSecret))
  )
}

// ---- Row mapping -----------------------------------------------------------

type Json = Record<string, unknown>

function asRecord(value: unknown): Json | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Json)
    : null
}

function toTimer(data: Json | null): ServerTimer | null {
  if (!data || typeof data.sessionId !== 'string' || typeof data.status !== 'string') {
    return null
  }
  const task = asRecord(data.task)
  return {
    sessionId: data.sessionId,
    status: data.status,
    startedAt: typeof data.startedAt === 'number' ? data.startedAt : null,
    task: task
      ? {
          taskId: typeof task.taskId === 'string' ? task.taskId : undefined,
          goalId: typeof task.goalId === 'string' ? task.goalId : undefined,
          taskTitle: typeof task.taskTitle === 'string' ? task.taskTitle : undefined,
        }
      : undefined,
  }
}

function toEntry(data: Json): ServerEntry | null {
  if (typeof data.startedAt !== 'string' || typeof data.endedAt !== 'string') return null
  return {
    id: typeof data.id === 'string' ? data.id : undefined,
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : undefined,
    taskId: typeof data.taskId === 'string' ? data.taskId : undefined,
    startedAt: data.startedAt,
    endedAt: data.endedAt,
  }
}

function toTask(data: Json): ServerTask | null {
  if (typeof data.id !== 'string' || typeof data.date !== 'string') return null
  return {
    id: data.id,
    templateId: typeof data.templateId === 'string' ? data.templateId : data.id,
    date: data.date,
    title: typeof data.title === 'string' ? data.title : '',
    status: typeof data.status === 'string' ? data.status : 'todo',
    startTime: typeof data.startTime === 'string' ? data.startTime : undefined,
    endTime: typeof data.endTime === 'string' ? data.endTime : undefined,
  }
}

/** Rows that are buried copies (carry deletedAt) are not live. */
function liveData(rows: Array<{ data: unknown }> | null): Json[] {
  return (rows ?? [])
    .map((row) => asRecord(row.data))
    .filter((data): data is Json => data !== null && !('deletedAt' in data))
}

// ---- One user --------------------------------------------------------------

async function processUser(
  admin: Admin,
  applicationServer: Awaited<ReturnType<typeof loadApplicationServer>>,
  userId: string,
  subscriptions: SubscriptionRow[],
  nowMs: number,
  summary: RunSummary,
) {
  const newest = [...subscriptions].sort((a, b) =>
    (b.last_used_at ?? b.created_at).localeCompare(a.last_used_at ?? a.created_at),
  )[0]
  const timeZone = validTimeZone(newest.timezone)
  const today = localDate(nowMs, timeZone)
  const dayStartIso = new Date(localToEpoch(today, '00:00', timeZone)).toISOString()

  const [settingsRes, timerRes, tasksRes, entriesRes, logRes] = await Promise.all([
    admin.from('settings').select('data').eq('user_id', userId).eq('id', SETTINGS_ROW).maybeSingle(),
    admin.from('active_timer').select('data').eq('user_id', userId).eq('id', ACTIVE_TIMER_ROW).maybeSingle(),
    admin.from('daily_tasks').select('data').eq('user_id', userId).eq('data->>date', today),
    admin.from('time_entries').select('data').eq('user_id', userId).gte('data->>endedAt', dayStartIso),
    admin
      .from('push_log')
      .select('kind,ref')
      .eq('user_id', userId)
      .gte('sent_at', new Date(nowMs - LOG_RETENTION_MS).toISOString()),
  ])
  for (const res of [settingsRes, timerRes, tasksRes, entriesRes, logRes]) {
    if (res.error) throw new Error(res.error.message)
  }

  const localNow = zonedParts(nowMs, timeZone)
  const timer = toTimer(asRecord(timerRes.data?.data ?? null))

  // Every stretch of the running sitting, not only today's, so its total is right.
  const entryById = new Map<string, ServerEntry>()
  const addEntries = (rows: Array<{ data: unknown }> | null) => {
    for (const data of liveData(rows)) {
      const entry = toEntry(data)
      if (!entry) continue
      entryById.set(entry.id ?? `${entry.startedAt}|${entry.endedAt}|${entry.taskId ?? ''}`, entry)
    }
  }
  addEntries(entriesRes.data as Array<{ data: unknown }> | null)
  if (timer && timer.status === 'running') {
    const sessionRes = await admin
      .from('time_entries')
      .select('data')
      .eq('user_id', userId)
      .eq('data->>sessionId', timer.sessionId)
    if (sessionRes.error) throw new Error(sessionRes.error.message)
    addEntries(sessionRes.data as Array<{ data: unknown }> | null)
  }

  const tasks = liveData(tasksRes.data as Array<{ data: unknown }> | null)
    .map(toTask)
    .filter((task): task is ServerTask => task !== null)

  const sent = new Set<string>(
    (logRes.data ?? []).map((row: { kind: string; ref: string }) => `${row.kind}|${row.ref}`),
  )

  const messages = decideReminders({
    clock: {
      now: nowMs,
      today,
      minutesOfDay: localNow.hour * 60 + localNow.minute,
      localMs: (date, time) => localToEpoch(date, time, timeZone),
    },
    settings: asRecord(settingsRes.data?.data ?? null),
    timer,
    entries: [...entryById.values()],
    tasks,
    wasSent: (kind, ref) => sent.has(`${kind}|${ref}`),
  })

  for (const message of messages) {
    await deliver(admin, applicationServer, userId, subscriptions, message, nowMs, summary)
  }
}

/**
 * Claims the reminder in push_log first, so a concurrent or repeated run cannot
 * send it twice. If nothing could be delivered, the claim is released so the
 * next run tries again.
 */
async function deliver(
  admin: Admin,
  applicationServer: Awaited<ReturnType<typeof loadApplicationServer>>,
  userId: string,
  subscriptions: SubscriptionRow[],
  message: ReminderMessage,
  nowMs: number,
  summary: RunSummary,
) {
  const claim = await admin
    .from('push_log')
    .upsert(
      {
        user_id: userId,
        kind: message.kind,
        ref: message.ref,
        sent_at: new Date(nowMs).toISOString(),
      },
      { onConflict: 'user_id,kind,ref', ignoreDuplicates: true },
    )
    .select('kind')
  if (claim.error) throw new Error(claim.error.message)
  if (!claim.data || claim.data.length === 0) {
    summary.skipped += 1
    return
  }

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    tag: message.tag,
    url: message.url,
  })

  const delivered: string[] = []
  const gone: string[] = []
  for (const subscription of subscriptions) {
    try {
      await applicationServer
        .subscribe({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        })
        .pushTextMessage(payload, { ttl: MESSAGE_TTL_SECONDS, urgency: Urgency.Normal })
      delivered.push(subscription.id)
    } catch (error) {
      const status = error instanceof PushMessageError ? error.response.status : 0
      if (status === 404 || status === 410) {
        gone.push(subscription.id)
      } else {
        summary.failed += 1
        console.warn('push failed', status, error instanceof Error ? error.message : String(error))
      }
    }
  }

  if (gone.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', gone)
    summary.gone += gone.length
  }

  if (delivered.length > 0) {
    await admin
      .from('push_subscriptions')
      .update({ last_used_at: new Date(nowMs).toISOString() })
      .in('id', delivered)
    summary.sent += 1
  } else {
    await admin
      .from('push_log')
      .delete()
      .eq('user_id', userId)
      .eq('kind', message.kind)
      .eq('ref', message.ref)
  }
}

// ---- Entry point -----------------------------------------------------------

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT')
  if (!supabaseUrl || !serviceKey || !subject) {
    return Response.json({ error: 'Function is not configured' }, { status: 500 })
  }

  const nowMs = Date.now()
  const admin: Admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const summary: RunSummary = { users: 0, sent: 0, skipped: 0, gone: 0, failed: 0, errors: 0 }

  try {
    const applicationServer = await loadApplicationServer(subject)

    const { data, error } = await admin
      .from('push_subscriptions')
      .select('id,user_id,endpoint,p256dh,auth,timezone,created_at,last_used_at')
    if (error) throw new Error(error.message)

    const byUser = new Map<string, SubscriptionRow[]>()
    for (const row of (data ?? []) as SubscriptionRow[]) {
      const list = byUser.get(row.user_id) ?? []
      list.push(row)
      byUser.set(row.user_id, list)
    }
    summary.users = byUser.size

    for (const [userId, subscriptions] of byUser) {
      try {
        await processUser(admin, applicationServer, userId, subscriptions, nowMs, summary)
      } catch (caught) {
        summary.errors += 1
        console.error('push-reminders: user failed', userId, caught instanceof Error ? caught.message : String(caught))
      }
    }

    await admin
      .from('push_log')
      .delete()
      .lt('sent_at', new Date(nowMs - LOG_RETENTION_MS).toISOString())
  } catch (caught) {
    console.error('push-reminders: run failed', caught instanceof Error ? caught.message : String(caught))
    return Response.json({ error: 'Run failed' }, { status: 500 })
  }

  return Response.json(summary)
})
