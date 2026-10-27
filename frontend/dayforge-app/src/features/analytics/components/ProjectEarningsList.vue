<script setup lang="ts">
import { ref } from 'vue'
import type { ID } from '../../../entities/types'
import type { ProjectRow } from '../composables/useTimerAnalytics'

defineProps<{
  rows: ProjectRow[]
  money: (value: number) => string
}>()

const emit = defineEmits<{
  (e: 'edit', goalId: ID): void
}>()

/** On phones the rate and the edit button sit behind a tap; wide screens show them. */
const expanded = ref<Set<string>>(new Set())

function isOpen(key: string): boolean {
  return expanded.value.has(key)
}

function toggle(key: string) {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}

function rateLabel(
  rate: number | null,
  money: (value: number) => string,
): string {
  return rate === null ? '—' : `${money(rate)} / h`
}
</script>

<template>
  <div class="ui-rows" role="list" aria-label="Earnings by project">
    <div
      v-for="row in rows"
      :key="row.key"
      class="ui-row earnings-row"
      :class="{ 'is-open': isOpen(row.key) }"
      role="listitem"
    >
      <button
        class="ui-row__head earnings-row__head"
        type="button"
        :aria-expanded="isOpen(row.key)"
        @click="toggle(row.key)"
      >
        <span class="earnings-row__main">
          <span
            class="earnings-row__dot"
            :style="{ background: row.color ?? 'var(--muted)' }"
            aria-hidden="true"
          ></span>
          <span class="ui-oneline earnings-row__name">{{ row.title }}</span>
          <span
            v-if="row.billing?.fixedPrice !== undefined"
            class="earnings-row__lock"
            role="img"
            aria-label="Fixed price"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="11" width="14" height="10" rx="2"></rect>
              <path d="M8 11V8a4 4 0 0 1 8 0v3"></path>
            </svg>
          </span>
          <strong class="earnings-row__amount">{{
            money(row.figures.earned)
          }}</strong>
        </span>
        <span class="earnings-row__rate">{{
          rateLabel(row.figures.effectiveRate, money)
        }}</span>
      </button>

      <div v-if="row.goalId" class="earnings-row__actions">
        <button
          class="ui-icon-btn"
          type="button"
          :aria-label="`Edit ${row.title} price`"
          @click="emit('edit', row.goalId)"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 20h4L19 9l-4-4L4 16v4z"></path>
            <path d="M13.5 6.5l4 4"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.earnings-row {
  flex-direction: row;
  align-items: center;
}

.earnings-row__head {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}

.earnings-row__main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.earnings-row__dot {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.earnings-row__name {
  flex: 1 1 auto;
  font-size: calc(14px * var(--text-scale));
  font-weight: 600;
  color: var(--text);
}

.earnings-row__lock {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent);
}

.earnings-row__lock svg {
  width: 12px;
  height: 12px;
}

.earnings-row__amount {
  flex: 0 0 auto;
  font-size: calc(14px * var(--text-scale));
  font-weight: 600;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Phone: the rate sits under the name and only shows once the row is open. */
.earnings-row__rate {
  display: none;
  font-size: calc(12px * var(--text-scale));
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.earnings-row.is-open .earnings-row__rate {
  display: block;
}

.earnings-row__actions {
  display: none;
  flex: 0 0 auto;
  padding-right: 12px;
}

.earnings-row.is-open .earnings-row__actions {
  display: flex;
}

.earnings-row.is-open {
  flex-wrap: wrap;
}

.earnings-row.is-open .earnings-row__head {
  flex-basis: 100%;
}

.earnings-row.is-open .earnings-row__actions {
  flex: 1 1 100%;
  justify-content: flex-end;
  padding: 0 12px 12px;
}

@container analytics (min-width: 900px) {
  .earnings-row__head {
    pointer-events: none;
  }

  .earnings-row__rate {
    display: block;
    flex: 0 0 auto;
    min-width: 96px;
    text-align: right;
  }

  .earnings-row__actions,
  .earnings-row.is-open .earnings-row__actions {
    display: flex;
    flex: 0 0 auto;
    padding: 0 12px 0 0;
  }

  .earnings-row.is-open .earnings-row__head {
    flex-basis: auto;
  }

  .earnings-row__head {
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }

  .earnings-row__main {
    flex: 1 1 auto;
  }
}
</style>
