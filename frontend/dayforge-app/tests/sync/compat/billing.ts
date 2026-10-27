/** Compat checks: project billing, clients and the money tab. */

import { mergeRow } from '../../../src/sync/merge'
import { SYNC_TABLE } from '../../../src/sync/types'
import { migrateGoals } from '../../../src/composables/goalSpace/goalMigration'
import { heldFromRow, SYNCED_SECTIONS } from '../../../src/composables/settingsRow'
import { DEFAULT_SETTINGS } from '../../../src/composables/useSettings'
import { parseBackupFile } from '../../../src/features/settings/composables/backupFormat'
import type { Goal } from '../../../src/entities/GoalEntity'
import {
  earnedPerHour,
  parseBillingDraft,
  projectFigures,
  sameBilling,
  sanitizeBilling,
} from '../../../src/features/analytics/composables/projectBilling'
import { amountPerDayNeeded, workingDaysLeft } from '../../../src/features/analytics/composables/incomeGoal'
import { buildRateLookup } from '../../../src/composables/timer/rates'
import { CLIENT_LIMITS, sanitizeClients, sanitizePayments } from '../../../src/composables/billing/clients'
import {
  NO_CLIENT_FILTER_ID,
  OVERDUE_AFTER_DAYS,
  clientSummaries,
  isOverdue,
  outstandingSummary,
  withPaymentAmount,
  withPaymentStatus,
} from '../../../src/features/analytics/composables/clientBilling'
import {
  CSV_BOM,
  buildCsv,
  buildReportLines,
  csvField,
  reportTotals,
} from '../../../src/features/analytics/composables/billingExport'
import { buildPrintHtml } from '../../../src/features/analytics/composables/printReport'
import { PAYMENT_STATUS, type Client, type PaymentRecord } from '../../../src/entities/BillingEntity'
import type { TimeEntry } from '../../../src/entities/TimerEntity'
import { T0, T1, T2, check, clone, goalRow, same, section } from './harness'

/** Analytics-only project figures: sync, backup, validation and the period math. */
export function verifyProjectBilling() {
  section('Project billing (analytics only)')

  const HOUR = 60 * 60 * 1000
  const near = (left: number, right: number) => Math.abs(left - right) < 1e-9

  const priced = goalRow({
    id: 'goal-d',
    billing: { fixedPrice: 1200, manualHours: 14, note: 'invoice 3' },
    updatedAt: T1,
  })
  const plain = goalRow({ id: 'goal-d', updatedAt: T0 })

  check(
    'billing survives a whole-row merge in either direction',
    same(mergeRow(SYNC_TABLE.GOALS, plain, priced).row.billing, priced.billing) &&
      same(mergeRow(SYNC_TABLE.GOALS, priced, plain).row.billing, priced.billing),
  )

  const backup = parseBackupFile({
    format: 'dayforge-backup',
    version: 1,
    goals: [clone(priced)],
    taskTemplates: [],
    dailyTasks: [],
  })
  check(
    'billing survives a backup round trip',
    backup !== null && same(backup.goals[0].billing, priced.billing),
  )

  const oldGoal = goalRow({ id: 'goal-e' }) as unknown as Goal
  migrateGoals([oldGoal])
  check('a project without billing keeps no billing key', !('billing' in oldGoal))

  check(
    'sanitize keeps valid figures and trims the note',
    same(
      sanitizeBilling({ fixedPrice: -5, manualHours: 3, note: '  hi  ' }),
      { manualHours: 3, note: 'hi' },
    ),
  )
  check(
    'sanitize drops non-finite and over-limit figures',
    sanitizeBilling({ fixedPrice: Number.NaN }) === undefined &&
      sanitizeBilling({ fixedPrice: 10_000_001 }) === undefined &&
      sanitizeBilling({ manualHours: 100_001 }) === undefined &&
      sanitizeBilling({}) === undefined,
  )

  const cleared = parseBillingDraft({ fixedPrice: '', manualHours: ' ', note: '' })
  check('an empty draft means no billing at all', cleared.ok && cleared.billing === undefined)
  const comma = parseBillingDraft({ fixedPrice: '', manualHours: '1,5', note: '' })
  check('a comma decimal is read as a point', comma.ok && comma.billing?.manualHours === 1.5)
  check(
    'a non-number is refused, not stored',
    !parseBillingDraft({ fixedPrice: 'abc', manualHours: '', note: '' }).ok,
  )
  check(
    'hours above the limit are refused',
    !parseBillingDraft({ fixedPrice: '', manualHours: '100001', note: '' }).ok,
  )
  check(
    'sameBilling detects a real change only',
    sameBilling({ fixedPrice: 1 }, { fixedPrice: 1 }) &&
      !sameBilling({ fixedPrice: 1 }, undefined) &&
      !sameBilling({ fixedPrice: 1 }, { fixedPrice: 2 }),
  )

  const base = { periodEarned: 0, allTimeEarned: 0, fallbackRate: 50 }

  const allTime = projectFigures({
    ...base,
    periodMs: 10 * HOUR,
    allTimeMs: 10 * HOUR,
    allTimeEarned: 500,
    isAllTime: true,
  })
  check(
    'All time without billing keeps tracked hours and earnings',
    allTime.ms === 10 * HOUR && allTime.earned === 500 && allTime.fixedBasis === null && allTime.effectiveRate === 50,
  )

  const prorata = projectFigures({
    ...base,
    periodMs: 2 * HOUR,
    allTimeMs: 10 * HOUR,
    allTimeEarned: 500,
    isAllTime: false,
    billing: { fixedPrice: 1000 },
  })
  check(
    'a fixed price is pro-rated by the share of tracked time',
    near(prorata.earned, 200) && prorata.fixedBasis === 'prorata' && prorata.ms === 2 * HOUR && near(prorata.effectiveRate ?? 0, 100),
  )

  const fixedAll = projectFigures({
    ...base,
    periodMs: 10 * HOUR,
    allTimeMs: 10 * HOUR,
    allTimeEarned: 500,
    isAllTime: true,
    billing: { fixedPrice: 1000 },
  })
  check(
    'a fixed price replaces the hourly earnings in All time',
    fixedAll.earned === 1000 && fixedAll.fixedBasis === 'fixed' && fixedAll.effectiveRate === 100,
  )

  const manualAll = projectFigures({
    ...base,
    periodMs: 10 * HOUR,
    allTimeMs: 10 * HOUR,
    allTimeEarned: 500,
    isAllTime: true,
    billing: { manualHours: 20 },
  })
  check(
    'manual hours replace tracked hours, priced at the blended rate',
    manualAll.ms === 20 * HOUR && near(manualAll.earned, 1000) && manualAll.manualHours && manualAll.effectiveRate === 50,
  )

  const manualShort = projectFigures({
    ...base,
    periodMs: 2 * HOUR,
    periodEarned: 100,
    allTimeMs: 10 * HOUR,
    allTimeEarned: 500,
    isAllTime: false,
    billing: { manualHours: 20 },
  })
  check(
    'manual hours are ignored outside All time',
    manualShort.ms === 2 * HOUR && manualShort.earned === 100 && !manualShort.manualHours,
  )

  const untracked = projectFigures({
    ...base,
    periodMs: 0,
    allTimeMs: 0,
    isAllTime: false,
    billing: { fixedPrice: 1000 },
  })
  check(
    'a fixed price with no tracked time is not shown outside All time',
    untracked.earned === 0 && untracked.fixedBasis === null,
  )

  const noTime = projectFigures({
    ...base,
    periodMs: 0,
    allTimeMs: 0,
    isAllTime: true,
    billing: { manualHours: 5 },
  })
  check(
    'manual hours with nothing tracked use the project rate',
    near(noTime.earned, 250) && noTime.effectiveRate === 50,
  )
}

function timeEntry(
  id: string,
  goalId: string | undefined,
  startIso: string,
  minutes: number,
  taskTitle?: string,
): TimeEntry {
  const start = Date.parse(startIso)
  return {
    id,
    sessionId: `session-${id}`,
    startedAt: startIso,
    endedAt: new Date(start + minutes * 60 * 1000).toISOString(),
    mode: 'stopwatch',
    source: 'timer',
    goalId,
    taskTitle,
    updatedAt: startIso,
  } as unknown as TimeEntry
}

export function verifyClientsAndBilling() {
  section('Clients, payment status and the report export')

  const clients = sanitizeClients([
    { id: 'c1', name: '  Acme  ', email: ' a@acme.test ', notes: '', archived: true, extra: 1 },
    { id: 'c1', name: 'Duplicate id' },
    { id: 'c2', name: '   ' },
    { id: '', name: 'No id' },
    'junk',
    { id: 'c3', name: 'x'.repeat(200) },
  ])
  check('clients: duplicate ids, blank names and junk are dropped', clients.length === 2)
  check(
    'clients: names and emails are trimmed, blanks removed, unknown fields kept',
    same(clients[0], { id: 'c1', name: 'Acme', email: 'a@acme.test', archived: true, extra: 1 }),
    clients[0],
  )
  check(
    'clients: long names are capped',
    clients[1].name.length === CLIENT_LIMITS.NAME_MAX,
  )

  const payments = sanitizePayments([
    { clientId: 'c1', month: '2026-09', status: 'invoiced', amount: 1200, invoicedAt: T0 },
    { clientId: 'c1', month: '2026-09', status: 'paid' },
    { clientId: 'c2', month: '2026-13', status: 'paid' },
    { clientId: 'c2', month: '2026-08', status: 'unbilled' },
    { clientId: 'c3', month: '2026-08', status: 'paid', amount: -5, paidAt: 'soon' },
  ])
  check('payments: one record per client and month, bad months and unbilled rows dropped', payments.length === 2, payments)
  check('payments: the record gets its key', payments[0].key === 'c1:2026-09')
  check(
    'payments: a bad amount or date is removed, not kept',
    payments[1].amount === undefined && payments[1].paidAt === undefined,
    payments[1],
  )

  check(
    'csv: plain text is not quoted',
    csvField('plain') === 'plain' && csvField(3.5) === '3.5',
  )
  check(
    'csv: commas, quotes, line breaks and semicolons are quoted',
    csvField('a,b') === '"a,b"' &&
      csvField('say "hi"') === '"say ""hi"""' &&
      csvField('line\nbreak') === '"line\nbreak"' &&
      csvField('x;y') === '"x;y"',
  )
  check('csv: spaces at the ends are quoted', csvField(' pad ') === '" pad "')
  check(
    'csv: text starting with a formula character is neutralised',
    csvField('=SUM(A1)', true) === "'=SUM(A1)" && csvField('-3', false) === '-3',
  )

  const goals = [
    { id: 'g1', title: 'Site, redesign', status: 'active', createdAt: T0, updatedAt: T0, clientId: 'c1' },
    { id: 'g2', title: 'Logo', status: 'active', createdAt: T0, updatedAt: T0 },
  ] as unknown as Goal[]
  const reportClients: Client[] = [{ id: 'c1', name: 'Acme; Ltd' }]
  const entries = [
    timeEntry('e1', 'g1', '2026-09-02T10:00:00.000Z', 120, 'Layout "v2"'),
    timeEntry('e2', 'g2', '2026-09-02T13:00:00.000Z', 30, 'Sketches'),
    timeEntry('e3', undefined, '2026-09-02T09:00:00.000Z', 15),
  ]
  const lines = buildReportLines({
    entries,
    goals,
    clients: reportClients,
    rateOf: (_taskId, goalId) => (goalId === 'g1' ? 50 : 0),
  })

  check('report: lines are in time order', lines.map((line) => line.taskTitle).join('|') === '|Layout "v2"|Sketches', lines)
  const totals = reportTotals(lines)
  check('report: totals add up the duration and amount', Math.abs(totals.ms - 165 * 60 * 1000) < 1 && Math.abs(totals.amount - 100) < 1e-9, totals)

  const csv = buildCsv(lines, 'USD')
  const rows = csv.slice(1).split('\r\n').filter((row) => row !== '')
  check('csv: starts with a UTF-8 byte order mark', csv.charCodeAt(0) === 0xfeff && csv.startsWith(CSV_BOM))
  check(
    'csv: header names the columns and the currency',
    rows[0] === 'Date,Start,End,Duration (h),Client,Project,Task,Rate (USD),Amount (USD)',
    rows[0],
  )
  check(
    'csv: a row keeps quoted client, project and task text',
    rows[2].includes('"Acme; Ltd"') && rows[2].includes('"Site, redesign"') && rows[2].includes('"Layout ""v2"""'),
    rows[2],
  )
  check('csv: duration is decimal hours and amount is rounded', rows[2].includes(',2.00,') && rows[2].endsWith(',50.00,100.00'), rows[2])
  check(
    'csv: the last row is the totals',
    rows[rows.length - 1] === 'Total,,,2.75,,,,,100.00',
    rows[rows.length - 1],
  )
  check('csv: entries without a project say so', rows[1].includes('Without a project') && rows[1].includes('No client'), rows[1])

  const lookup = buildRateLookup([], goals, 40)
  const billed = [...goals]
  billed[0] = { ...billed[0], billing: { fixedPrice: 1000 } } as Goal
  const summaries = clientSummaries({
    periodEntries: [timeEntry('p1', 'g1', '2026-09-02T10:00:00.000Z', 120), timeEntry('p2', 'g2', '2026-09-02T13:00:00.000Z', 60)],
    allEntries: [timeEntry('p1', 'g1', '2026-09-02T10:00:00.000Z', 120), timeEntry('p2', 'g2', '2026-09-02T13:00:00.000Z', 60)],
    goals: billed,
    clients: reportClients,
    lookup,
    isAllTime: true,
  })
  check(
    'by client: a fixed price replaces the hourly earnings of its projects',
    summaries[0].clientId === 'c1' && summaries[0].earned === 1000 && summaries[0].hasFixedPrice && summaries[0].ms === 2 * 60 * 60 * 1000,
    summaries,
  )
  check(
    'by client: projects without a client are one row at their own rate',
    summaries[1].key === NO_CLIENT_FILTER_ID && Math.abs(summaries[1].earned - 40) < 1e-9,
    summaries[1],
  )

  const T_NOW = Date.parse('2026-10-25T12:00:00.000Z')
  const DAY = 24 * 60 * 60 * 1000
  const started = withPaymentStatus([], 'c1', '2026-09', PAYMENT_STATUS.INVOICED, T0, 1200)
  check(
    'payments: invoicing stores the amount and the date, not a paid date',
    started.length === 1 && started[0].amount === 1200 && started[0].invoicedAt === T0 && started[0].paidAt === undefined,
    started,
  )
  const paid = withPaymentStatus(started, 'c1', '2026-09', PAYMENT_STATUS.PAID, T1)
  check(
    'payments: paying keeps the invoice date and stamps the paid date',
    paid.length === 1 && paid[0].invoicedAt === T0 && paid[0].paidAt === T1 && paid[0].amount === 1200,
    paid,
  )
  const reopened = withPaymentStatus(paid, 'c1', '2026-09', PAYMENT_STATUS.INVOICED, T2)
  check('payments: moving back to invoiced clears the paid date', reopened[0].paidAt === undefined && reopened[0].invoicedAt === T0)
  check('payments: unbilled removes the record', withPaymentStatus(paid, 'c1', '2026-09', PAYMENT_STATUS.UNBILLED, T2).length === 0)
  check(
    'payments: clearing an amount removes the field',
    withPaymentAmount(started, 'c1', '2026-09', undefined)[0].amount === undefined,
  )

  const ledger: PaymentRecord[] = [
    { key: 'c1:2026-07', clientId: 'c1', month: '2026-07', status: PAYMENT_STATUS.INVOICED, amount: 1000, invoicedAt: new Date(T_NOW - 31 * DAY).toISOString() },
    { key: 'c1:2026-08', clientId: 'c1', month: '2026-08', status: PAYMENT_STATUS.INVOICED, amount: 500.25, invoicedAt: new Date(T_NOW - 29 * DAY).toISOString() },
    { key: 'c2:2026-08', clientId: 'c2', month: '2026-08', status: PAYMENT_STATUS.PAID, amount: 300, invoicedAt: new Date(T_NOW - 60 * DAY).toISOString() },
    { key: 'c2:2026-09', clientId: 'c2', month: '2026-09', status: PAYMENT_STATUS.INVOICED, invoicedAt: new Date(T_NOW - DAY).toISOString() },
  ]
  const owed = outstandingSummary(ledger, T_NOW)
  check(
    'outstanding: sums invoiced amounts, leaves out paid ones',
    Math.abs(owed.total - 1500.25) < 1e-9 && owed.count === 3,
    owed,
  )
  check(
    'outstanding: counts overdue invoices (over 30 days) and invoices with no amount',
    owed.overdueCount === 1 && Math.abs(owed.overdueTotal - 1000) < 1e-9 && owed.withoutAmountCount === 1,
    owed,
  )
  check(
    'overdue: exactly 30 days is not yet overdue',
    !isOverdue({ ...ledger[1], invoicedAt: new Date(T_NOW - OVERDUE_AFTER_DAYS * DAY).toISOString() }, T_NOW),
  )
  check(
    'payments: a client filter narrows the outstanding total',
    outstandingSummary(ledger.filter((p) => p.clientId === 'c2'), T_NOW).total === 0,
  )

  const html = buildPrintHtml({
    authorName: 'Ada <b>Lovelace</b>',
    clientLabel: 'Acme',
    periodLabel: 'This month',
    from: '2026-09-01',
    to: '2026-09-30',
    currency: 'USD',
    locale: 'en-GB',
    generatedAt: 'now',
    lines: [
      { ...lines[1], projectTitle: '<img src=x onerror=alert(1)>', taskTitle: '<script>x</script>' },
    ],
  })
  check('print: user text is escaped', html.includes('&lt;script&gt;x&lt;/script&gt;') && !html.includes('<script>x'))
  check('print: no script runs in the report', !/<script/i.test(html))
  check('print: the author name is shown escaped', html.includes('Ada &lt;b&gt;Lovelace&lt;/b&gt;'))

  const backup = parseBackupFile({
    format: 'dayforge-backup',
    version: 1,
    goals: [{ ...goals[0] }],
    taskTemplates: [],
    dailyTasks: [],
    settings: { billing: { clients, payments } },
  })
  check('backup: a project keeps its client', backup?.goals[0].clientId === 'c1')
  const restored = backup?.settings as { billing?: { clients?: unknown; payments?: unknown } } | undefined
  check(
    'backup: clients and payments travel in the settings',
    same(restored?.billing?.clients, clients) && same(restored?.billing?.payments, payments),
  )

  const plainProject = goalRow({ id: 'goal-g', updatedAt: T0 })
  const withClient = goalRow({ id: 'goal-g', clientId: 'c1', updatedAt: T1 })
  check(
    'sync: a project client survives a whole-row merge in either direction',
    mergeRow(SYNC_TABLE.GOALS, plainProject, withClient).row.clientId === 'c1' &&
      mergeRow(SYNC_TABLE.GOALS, withClient, plainProject).row.clientId === 'c1',
  )

  const settingsRow: Record<string, unknown> = { id: 'settings', updatedAt: T1 }
  SYNCED_SECTIONS.forEach((section) => {
    settingsRow[section] = clone(DEFAULT_SETTINGS[section])
  })
  settingsRow.billing = { clients, payments }
  check(
    'sync: billing is a synced settings section, not held back',
    !('billing' in heldFromRow(settingsRow, SYNCED_SECTIONS, DEFAULT_SETTINGS)) &&
      (SYNCED_SECTIONS as readonly string[]).includes('billing'),
  )
}

export function verifyMoneyTab() {
  section('Money tab: the goal per remaining day and earnings per hour')

  const HOUR = 60 * 60 * 1000

  check(
    'working days left count from today through month end',
    workingDaysLeft(new Date(2026, 9, 27)) === 4 &&
      workingDaysLeft(new Date(2026, 9, 30)) === 1 &&
      workingDaysLeft(new Date(2026, 9, 31)) === 0,
  )
  check(
    'the amount per remaining day is the gap spread over the days left',
    amountPerDayNeeded(3000, 1240, 4) === 440,
  )
  check(
    'no amount per day once the goal is met or no working day is left',
    amountPerDayNeeded(1000, 1000, 5) === null && amountPerDayNeeded(1000, 500, 0) === null,
  )
  check(
    'earned per hour is null without hours, and divides by tracked hours otherwise',
    earnedPerHour(1200, 2 * HOUR) === 600 && earnedPerHour(100, 0) === null,
  )
}
