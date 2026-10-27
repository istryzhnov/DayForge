<script setup lang="ts">
import { ref } from 'vue'
import { formatHoursMinutes } from '../../../composables/timer/format'
import type { ProjectProgress } from '../composables/projectProgress'

defineProps<{
  rows: ProjectProgress[]
}>()

/** Rows start closed so the list reads as bars; a tap opens the figures. */
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

function signedHours(diffMs: number): string {
  const magnitude = formatHoursMinutes(Math.abs(diffMs))
  if (magnitude === formatHoursMinutes(0)) return magnitude
  return `${diffMs > 0 ? '+' : '−'}${magnitude}`
}

function fillStyle(row: ProjectProgress) {
  return {
    width: `${row.fill * 100}%`,
    background: row.planned ? (row.color ?? 'var(--accent)') : undefined,
  }
}
</script>

<template>
  <div class="ui-rows" role="list" aria-label="Projects">
    <div
      v-for="row in rows"
      :key="row.key"
      class="ui-row"
      :class="{ 'is-open': isOpen(row.key) }"
      role="listitem"
    >
      <button
        class="ui-row__head"
        type="button"
        :aria-expanded="isOpen(row.key)"
        @click="toggle(row.key)"
      >
        <span class="project-progress__top">
          <span
            class="project-progress__dot"
            :style="{ background: row.color ?? 'var(--muted)' }"
            aria-hidden="true"
          ></span>
          <span class="ui-oneline project-progress__name">{{ row.title }}</span>
          <strong class="project-progress__actual">
            {{ formatHoursMinutes(row.trackedMs) }}
          </strong>
          <span class="project-progress__plan">
            {{ row.planned ? `/ ${formatHoursMinutes(row.plannedMs)}` : '—' }}
          </span>
        </span>
        <span
          class="ui-progress ui-progress--thin"
          :class="{ 'is-unplanned': !row.planned }"
        >
          <span :style="fillStyle(row)"></span>
        </span>
      </button>

      <dl v-if="isOpen(row.key)" class="ui-row__detail project-progress__detail">
        <div>
          <dt>Plan</dt>
          <dd>{{ row.planned ? formatHoursMinutes(row.plannedMs) : '—' }}</dd>
        </div>
        <div>
          <dt>Diff</dt>
          <dd>{{ row.diffMs === null ? '—' : signedHours(row.diffMs) }}</dd>
        </div>
        <div>
          <dt>Tasks</dt>
          <dd>{{ row.taskCount }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<style scoped>
.project-progress__top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.project-progress__dot {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.project-progress__name {
  flex: 1 1 auto;
  font-size: calc(14px * var(--text-scale));
  font-weight: 600;
  color: var(--text);
}

.project-progress__actual {
  flex: 0 0 auto;
  font-size: calc(14px * var(--text-scale));
  font-weight: 600;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.project-progress__plan {
  flex: 0 0 auto;
  min-width: 56px;
  font-size: calc(12px * var(--text-scale));
  color: var(--muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-progress__detail {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.project-progress__detail > div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.project-progress__detail dt {
  font-size: calc(11px * var(--text-scale));
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-progress__detail dd {
  margin: 0;
  font-size: calc(13px * var(--text-scale));
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
