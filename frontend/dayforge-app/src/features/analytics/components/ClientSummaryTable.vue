<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  PAYMENT_STATUS,
  type PaymentRecord,
  type PaymentStatus,
} from '../../../entities/BillingEntity'
import type { ID } from '../../../entities/types'
import {
  findPayment,
  roundMoney,
  type ClientSummaryRow,
} from '../composables/clientBilling'
import { CLIENT_LIMITS } from '../../../composables/billing/clients'

const props = defineProps<{
  rows: ClientSummaryRow[]
  payments: PaymentRecord[]
  /** The month statuses are kept for, `YYYY-MM`. */
  month: string
  locale: string
  money: (value: number) => string
  hours: (ms: number) => string
}>()

const emit = defineEmits<{
  (e: 'set-status', clientId: ID, status: PaymentStatus, amount: number): void
  (e: 'set-amount', clientId: ID, amount: number | undefined): void
}>()

const { t } = useI18n()

/** `labelKey` is rendered with `t()` in the template, so a language switch updates it. */
const STATUS_OPTIONS: { id: PaymentStatus; labelKey: string }[] = [
  { id: PAYMENT_STATUS.UNBILLED, labelKey: 'analytics.statusUnbilled' },
  { id: PAYMENT_STATUS.INVOICED, labelKey: 'analytics.statusInvoiced' },
  { id: PAYMENT_STATUS.PAID, labelKey: 'analytics.statusPaid' },
]

/** Clients with no name fall back to the translated "No client". */
function titleOf(row: ClientSummaryRow): string {
  return row.clientId ? row.title : t('analytics.noClient')
}

const dateFormat = computed(
  () => new Intl.DateTimeFormat(props.locale, { dateStyle: 'medium' }),
)

function paymentOf(row: ClientSummaryRow): PaymentRecord | undefined {
  return row.clientId
    ? findPayment(props.payments, row.clientId, props.month)
    : undefined
}

function statusOf(row: ClientSummaryRow): PaymentStatus {
  return paymentOf(row)?.status ?? PAYMENT_STATUS.UNBILLED
}

/** A new invoice starts at what the client earned this period, and keeps any amount already typed. */
function handleStatus(row: ClientSummaryRow, event: Event) {
  if (!row.clientId) return
  const status = (event.target as HTMLSelectElement).value as PaymentStatus
  const existing = paymentOf(row)?.amount
  emit('set-status', row.clientId, status, existing ?? roundMoney(row.earned))
}

function handleAmount(row: ClientSummaryRow, event: Event) {
  if (!row.clientId) return
  const input = event.target as HTMLInputElement
  const text = input.value.trim().replace(',', '.')

  if (text === '') {
    emit('set-amount', row.clientId, undefined)
    return
  }

  const value = Number(text)
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > CLIENT_LIMITS.AMOUNT_MAX
  ) {
    input.value = String(paymentOf(row)?.amount ?? '')
    return
  }
  emit('set-amount', row.clientId, roundMoney(value))
}

function dateLabel(iso: string | undefined): string {
  if (!iso) return ''
  return dateFormat.value.format(new Date(iso))
}
</script>

<template>
  <div class="analytics-table-wrap">
    <table class="analytics-table analytics-table--clients">
      <thead>
        <tr>
          <th class="analytics-table__name">{{ t('analytics.colClient') }}</th>
          <th class="analytics-table__num">{{ t('analytics.colHours') }}</th>
          <th class="analytics-table__num">{{ t('analytics.earned') }}</th>
          <th class="analytics-table__name">
            {{ t('analytics.colInvoice') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.key">
          <td class="analytics-table__name" :title="titleOf(row)">
            <span class="analytics-project__title">{{ titleOf(row) }}</span>
            <span
              v-if="row.hasFixedPrice || row.archived"
              class="analytics-project__badges"
            >
              <span v-if="row.hasFixedPrice" class="analytics-badge">{{
                t('analytics.fixedBadge')
              }}</span>
              <span v-if="row.archived" class="analytics-badge">{{
                t('analytics.archivedBadge')
              }}</span>
            </span>
          </td>
          <td class="analytics-table__num">{{ hours(row.ms) }}</td>
          <td class="analytics-table__num">{{ money(row.earned) }}</td>
          <td class="analytics-table__name">
            <div v-if="row.clientId" class="analytics-invoice">
              <select
                class="analytics-status"
                :class="`analytics-status--${statusOf(row)}`"
                :value="statusOf(row)"
                :aria-label="
                  t('analytics.paymentStatusAria', {
                    title: titleOf(row),
                    month,
                  })
                "
                @change="handleStatus(row, $event)"
              >
                <option
                  v-for="option in STATUS_OPTIONS"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ t(option.labelKey) }}
                </option>
              </select>
              <input
                v-if="statusOf(row) !== PAYMENT_STATUS.UNBILLED"
                class="analytics-amount"
                type="text"
                inputmode="decimal"
                :value="paymentOf(row)?.amount ?? ''"
                placeholder="0.00"
                :aria-label="
                  t('analytics.invoiceAmountAria', { title: titleOf(row) })
                "
                @change="handleAmount(row, $event)"
              />
              <span
                v-if="paymentOf(row)?.invoicedAt"
                class="analytics-table__muted"
              >
                {{
                  t('analytics.invoicedOn', {
                    date: dateLabel(paymentOf(row)?.invoicedAt),
                  })
                }}
                <template v-if="paymentOf(row)?.paidAt">
                  {{
                    t('analytics.paidOn', {
                      date: dateLabel(paymentOf(row)?.paidAt),
                    })
                  }}
                </template>
              </span>
            </div>
            <span v-else class="analytics-table__muted">{{
              t('analytics.notInvoiced')
            }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
