<script setup lang="ts">
import type {
  HabitMonthCell,
  HabitMonthRow as HabitMonthRowData,
} from '../../../composables/analytics/habits'

defineProps<{
  row: HabitMonthRowData
  color?: string
  projectName: string
  percent: string
  cellLabel: (cell: HabitMonthCell) => string
}>()
</script>

<template>
  <li class="habits__row">
    <div class="habits__row-head">
      <p
        class="habits__name"
        :title="projectName ? `${row.title} · ${projectName}` : row.title"
      >
        <span
          v-if="row.goalId"
          class="habits__dot"
          :style="{ background: color ?? 'var(--muted)' }"
          aria-hidden="true"
        />
        <span class="habits__title">{{ row.title }}</span>
      </p>
      <p class="habits__score">
        {{ row.completed }}/{{ row.expected }}
        <em>{{ percent }}</em>
      </p>
    </div>
    <div class="habits__strip">
      <span
        v-for="cell in row.cells"
        :key="cell.date"
        class="habits__cell"
        :class="`is-${cell.state}`"
        role="img"
        :aria-label="cellLabel(cell)"
        :title="cellLabel(cell)"
      />
    </div>
  </li>
</template>
