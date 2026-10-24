<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Client } from '../../../entities/BillingEntity'
import type { Goal } from '../../../entities/GoalEntity'
import type { TimeEntry } from '../../../entities/TimerEntity'
import type { ID, ISODate } from '../../../entities/types'
import { NO_PROJECT_KEY } from '../../../composables/timer/analytics'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import {
  buildCsv,
  buildReportLines,
  hoursOf,
  reportFileName,
  reportTotals,
} from '../composables/billingExport'
import { buildPrintHtml, openPrintReport } from '../composables/printReport'
import { roundMoney } from '../composables/clientBilling'

/**
 * Loaded on demand from Analytics, so the export code stays out of the main
 * bundle. It receives entries already narrowed to the period and client.
 */
const props = defineProps<{
  entries: TimeEntry[]
  goals: Goal[]
  clients: Client[]
  rateOf: (taskId?: ID, goalId?: ID) => number
  currency: string
  locale: string
  from: ISODate
  to: ISODate
  periodLabel: string
  clientLabel: string
  authorName?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

useFocusTrap({ onEscape: () => emit('close') })

type ExportFormat = 'csv' | 'pdf'
const format = ref<ExportFormat>('csv')
const projectKey = ref<string>('all')
const message = ref('')
const failed = ref(false)

/** Projects that have entries in this report, so the list never offers an empty one. */
const projectOptions = computed(() => {
  const goalById = new Map(props.goals.map((goal) => [goal.id, goal]))
  const keys = new Map<string, string>()

  props.entries.forEach((entry) => {
    const key = entry.goalId ?? NO_PROJECT_KEY
    if (keys.has(key)) return
    const title = entry.goalId
      ? (goalById.get(entry.goalId)?.title ?? 'Deleted project')
      : 'Without a project'
    keys.set(key, title)
  })

  return [...keys].sort((a, b) => a[1].localeCompare(b[1]))
})

const scopedEntries = computed(() =>
  projectKey.value === 'all'
    ? props.entries
    : props.entries.filter(
        (entry) => (entry.goalId ?? NO_PROJECT_KEY) === projectKey.value,
      ),
)

const lines = computed(() =>
  buildReportLines({
    entries: scopedEntries.value,
    goals: props.goals,
    clients: props.clients,
    rateOf: props.rateOf,
  }),
)

const totals = computed(() => reportTotals(lines.value))

const money = computed(
  () =>
    new Intl.NumberFormat(props.locale, {
      style: 'currency',
      currency: props.currency,
      maximumFractionDigits: 2,
    }),
)

const summaryLabel = computed(() => {
  const count = lines.value.length
  const entriesLabel = `${count} ${count === 1 ? 'entry' : 'entries'}`
  return `${entriesLabel} · ${hoursOf(totals.value.ms)} h · ${money.value.format(roundMoney(totals.value.amount))}`
})

/** Saves a text file through a temporary link, the same way the backup does. */
function saveFile(content: string, type: string, fileName: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function exportCsv() {
  const csv = buildCsv(lines.value, props.currency)
  saveFile(csv, 'text/csv;charset=utf-8', reportFileName(props.from, props.to))
  message.value = 'CSV saved to your downloads.'
  failed.value = false
}

function exportPdf() {
  const html = buildPrintHtml({
    authorName: props.authorName,
    clientLabel: props.clientLabel,
    periodLabel: props.periodLabel,
    from: props.from,
    to: props.to,
    currency: props.currency,
    locale: props.locale,
    lines: lines.value,
    generatedAt: new Date().toLocaleString(props.locale),
  })

  if (!openPrintReport(html)) {
    failed.value = true
    message.value =
      'The browser blocked the report window. Allow pop-ups for this site and try again.'
    return
  }
  failed.value = false
  message.value = 'In the print dialog, choose "Save as PDF".'
}

function handleExport() {
  if (format.value === 'csv') exportCsv()
  else exportPdf()
}
</script>

<template>
  <div class="new-goal-modal" @click.self="emit('close')">
    <div class="modal-overlay" @click="emit('close')"></div>
    <form
      ref="trapRef"
      class="modal-card billing-export"
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-export-title"
      @submit.prevent="handleExport"
    >
      <h3 id="billing-export-title">Export report</h3>
      <p class="project-billing__note">
        {{ periodLabel }} · {{ clientLabel }} · {{ from }} to {{ to }}
      </p>

      <p class="sidebar-caption">Format</p>
      <div class="settings-chips">
        <button
          class="theme-chip"
          :class="{ active: format === 'csv' }"
          type="button"
          :aria-pressed="format === 'csv'"
          @click="format = 'csv'"
        >
          CSV spreadsheet
        </button>
        <button
          class="theme-chip"
          :class="{ active: format === 'pdf' }"
          type="button"
          :aria-pressed="format === 'pdf'"
          @click="format = 'pdf'"
        >
          PDF (print)
        </button>
      </div>

      <label class="project-billing__field">
        <span>Project</span>
        <select v-model="projectKey">
          <option value="all">All projects</option>
          <option v-for="[key, title] in projectOptions" :key="key" :value="key">
            {{ title }}
          </option>
        </select>
      </label>

      <p class="billing-export__summary">{{ summaryLabel }}</p>

      <p class="project-billing__note">
        <template v-if="format === 'csv'">
          UTF-8 with a byte order mark, so Excel and Numbers read the letters
          correctly. Durations are decimal hours.
        </template>
        <template v-else>
          Opens a print view. Choose "Save as PDF" in the print dialog. Nothing
          leaves your device.
        </template>
      </p>

      <p
        v-if="message"
        :class="failed ? 'project-billing__error' : 'project-billing__note'"
        role="status"
      >
        {{ message }}
      </p>

      <div class="modal-actions project-billing__actions">
        <button class="btn btn-ghost" type="button" @click="emit('close')">
          Close
        </button>
        <button
          class="btn btn-primary"
          type="submit"
          :disabled="lines.length === 0"
        >
          {{ format === 'csv' ? 'Download CSV' : 'Open print view' }}
        </button>
      </div>
    </form>
  </div>
</template>
