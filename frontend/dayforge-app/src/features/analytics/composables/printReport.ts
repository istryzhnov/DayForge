import type { ISODate } from '../../../entities/types'
import { hoursOf, reportTotals, type ReportLine } from './billingExport'
import { roundMoney } from './clientBilling'

/**
 * Everything the printed report shows. The page is plain HTML with inline
 * styles and no script, so it works under the app's CSP and prints cleanly;
 * saving it as PDF is the browser's own print-to-PDF.
 */
export interface PrintReportModel {
  authorName?: string
  clientLabel: string
  periodLabel: string
  from: ISODate
  to: ISODate
  currency: string
  locale: string
  lines: ReportLine[]
  generatedAt: string
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const PRINT_CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; padding: 32px; background: #fff; color: #1d1d1f;
  font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
h1 { font-size: 22px; margin: 0 0 4px; }
h2 { font-size: 15px; margin: 24px 0 8px; display: flex; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; break-after: avoid; }
h2 span { font-weight: 400; color: #555; }
.meta { margin: 0; color: #555; }
.head { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap;
  padding-bottom: 16px; border-bottom: 2px solid #1d1d1f; }
dl { display: grid; grid-template-columns: auto auto; gap: 2px 12px; margin: 0; }
dt { color: #555; }
dd { margin: 0; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 5px 6px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
th { font-size: 12px; color: #555; font-weight: 600; }
.num { text-align: right; white-space: nowrap; }
tr { break-inside: avoid; }
thead { display: table-header-group; }
.total { margin-top: 24px; padding-top: 12px; border-top: 2px solid #1d1d1f;
  display: flex; justify-content: flex-end; gap: 24px; flex-wrap: wrap; font-weight: 600; }
.generated { margin-top: 24px; color: #777; font-size: 12px; }
@page { margin: 16mm; }
@media print {
  body { padding: 0; }
  .generated { position: fixed; bottom: 0; }
}
@media (max-width: 480px) {
  body { padding: 16px; }
  th:nth-child(5), td:nth-child(5) { display: none; }
}
`

/** The printable report as one self-contained HTML document. */
export function buildPrintHtml(model: PrintReportModel): string {
  const money = new Intl.NumberFormat(model.locale, {
    style: 'currency',
    currency: model.currency,
    maximumFractionDigits: 2,
  })
  const text = escapeHtml
  const totals = reportTotals(model.lines)

  const groups = new Map<string, ReportLine[]>()
  model.lines.forEach((line) => {
    const group = groups.get(line.projectTitle) ?? []
    group.push(line)
    groups.set(line.projectTitle, group)
  })

  const sections = [...groups]
    .map(([project, lines]) => {
      const sub = reportTotals(lines)
      const rows = lines
        .map(
          (line) => `<tr>
  <td>${text(line.date)}</td>
  <td>${text(line.start)}–${text(line.end)}</td>
  <td>${text(line.taskTitle || '—')}</td>
  <td class="num">${hoursOf(line.ms)}</td>
  <td class="num">${money.format(line.rate)}</td>
  <td class="num">${money.format(roundMoney(line.amount))}</td>
</tr>`,
        )
        .join('\n')

      return `<section>
<h2><span>${text(project)}</span><span>${hoursOf(sub.ms)} h · ${money.format(roundMoney(sub.amount))}</span></h2>
<table>
<thead><tr><th>Date</th><th>Time</th><th>Task</th><th class="num">Hours</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</section>`
    })
    .join('\n')

  const author = model.authorName
    ? `<p class="meta">${text(model.authorName)}</p>`
    : ''

  return `<!doctype html>
<html lang="${text(model.locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Time report ${text(model.from)} to ${text(model.to)}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
<header class="head">
<div>
<h1>Time report</h1>
${author}
</div>
<dl>
<dt>Client</dt><dd>${text(model.clientLabel)}</dd>
<dt>Period</dt><dd>${text(model.periodLabel)}</dd>
<dt>Dates</dt><dd>${text(model.from)} to ${text(model.to)}</dd>
<dt>Currency</dt><dd>${text(model.currency)}</dd>
</dl>
</header>
${sections || '<p class="meta">Nothing tracked in this period.</p>'}
<div class="total">
<span>Total ${hoursOf(totals.ms)} h</span>
<span>${money.format(roundMoney(totals.amount))}</span>
</div>
<p class="generated">Generated ${text(model.generatedAt)} with DayForge</p>
</body>
</html>`
}

/**
 * Opens the report in a new window and starts the print dialog. Returns false
 * when the browser blocked the window, so the caller can say so.
 */
export function openPrintReport(html: string): boolean {
  const win = window.open('', '_blank')
  if (!win) return false

  win.opener = null
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  win.setTimeout(() => win.print(), 200)
  return true
}
