import type { Client } from '../../../entities/BillingEntity'
import type { Goal } from '../../../entities/GoalEntity'
import type { TimeEntry } from '../../../entities/TimerEntity'
import type { ID, ISODate } from '../../../entities/types'
import { entryDate, entryDurationMs } from '../../../composables/timer/entries'
import { earningsFor } from '../../../composables/timer/analytics'
import { roundMoney } from './clientBilling'

/** One line of a report: a time entry with its project, client and money. */
export interface ReportLine {
  date: ISODate
  /** Local clock times, `HH:mm`. */
  start: string
  end: string
  ms: number
  clientTitle: string
  projectTitle: string
  taskTitle: string
  rate: number
  /** Unrounded, so totals add up before the final rounding. */
  amount: number
  /** Epoch ms, for ordering. */
  startedAtMs: number
}

export interface ReportTotals {
  ms: number
  amount: number
}

/** RFC 4180 says comma. Fields holding a `;` are quoted, so either works. */
export const CSV_DELIMITER = ','
export const CSV_NEWLINE = '\r\n'
/** Excel reads a BOM as UTF-8, so Cyrillic and other scripts survive. */
export const CSV_BOM = '﻿'

const HOUR_MS = 60 * 60 * 1000

function clockOf(iso: string): string {
  const date = new Date(iso)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function hoursOf(ms: number): string {
  return (ms / HOUR_MS).toFixed(2)
}

export interface ReportLineInput {
  entries: TimeEntry[]
  goals: Goal[]
  clients: Client[]
  /** The hourly rate an entry was billed at: task, then project, then default. */
  rateOf: (taskId?: ID, goalId?: ID) => number
}

/** Entries in time order, each with the rate and amount it was billed at. */
export function buildReportLines(input: ReportLineInput): ReportLine[] {
  const goalById = new Map(input.goals.map((goal) => [goal.id, goal]))
  const clientById = new Map(input.clients.map((client) => [client.id, client]))

  return input.entries
    .map((entry): ReportLine => {
      const goal = entry.goalId ? goalById.get(entry.goalId) : undefined
      const client = goal?.clientId ? clientById.get(goal.clientId) : undefined
      const ms = entryDurationMs(entry)
      const rate = input.rateOf(entry.taskId, entry.goalId)

      return {
        date: entryDate(entry),
        start: clockOf(entry.startedAt),
        end: clockOf(entry.endedAt),
        ms,
        clientTitle: client?.name ?? 'No client',
        projectTitle:
          goal?.title ??
          (entry.goalId ? 'Deleted project' : 'Without a project'),
        taskTitle: entry.taskTitle ?? '',
        rate,
        amount: earningsFor(ms, rate),
        startedAtMs: Date.parse(entry.startedAt),
      }
    })
    .sort((a, b) => a.startedAtMs - b.startedAtMs)
}

export function reportTotals(lines: ReportLine[]): ReportTotals {
  return lines.reduce(
    (totals, line) => ({
      ms: totals.ms + line.ms,
      amount: totals.amount + line.amount,
    }),
    { ms: 0, amount: 0 },
  )
}

/**
 * Quotes a field when it holds the delimiter, a quote, a line break, a `;` or
 * spaces at either end, doubling any inner quotes. Text cells that start with a
 * formula character get an apostrophe so a spreadsheet will not run them.
 */
export function csvField(value: string | number, isText = false): string {
  let text = String(value)
  if (isText && /^[=+\-@\t\r]/.test(text)) text = `'${text}`

  const needsQuotes = /[",\r\n;]|^\s|\s$/.test(text)
  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text
}

function csvRow(
  cells: Array<{ value: string | number; text?: boolean }>,
): string {
  return cells
    .map((cell) => csvField(cell.value, cell.text === true))
    .join(CSV_DELIMITER)
}

/**
 * The time-entry report as CSV text, BOM first, with a totals row at the end.
 * Durations are decimal hours; amounts are in the account currency.
 */
export function buildCsv(lines: ReportLine[], currency: string): string {
  const header = csvRow([
    { value: 'Date' },
    { value: 'Start' },
    { value: 'End' },
    { value: 'Duration (h)' },
    { value: 'Client' },
    { value: 'Project' },
    { value: 'Task' },
    { value: `Rate (${currency})` },
    { value: `Amount (${currency})` },
  ])

  const body = lines.map((line) =>
    csvRow([
      { value: line.date },
      { value: line.start },
      { value: line.end },
      { value: hoursOf(line.ms) },
      { value: line.clientTitle, text: true },
      { value: line.projectTitle, text: true },
      { value: line.taskTitle, text: true },
      { value: line.rate.toFixed(2) },
      { value: roundMoney(line.amount).toFixed(2) },
    ]),
  )

  const totals = reportTotals(lines)
  const totalRow = csvRow([
    { value: 'Total' },
    { value: '' },
    { value: '' },
    { value: hoursOf(totals.ms) },
    { value: '' },
    { value: '' },
    { value: '' },
    { value: '' },
    { value: roundMoney(totals.amount).toFixed(2) },
  ])

  return CSV_BOM + [header, ...body, totalRow].join(CSV_NEWLINE) + CSV_NEWLINE
}

export function reportFileName(from: ISODate, to: ISODate): string {
  return `dayforge-report-${from}_${to}.csv`
}
