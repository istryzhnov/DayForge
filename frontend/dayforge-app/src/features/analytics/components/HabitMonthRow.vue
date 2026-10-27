<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
import type {
  HabitMonthCell,
  HabitMonthRow as HabitMonthRowData,
} from '../../../composables/analytics/habits'

defineProps<{
  row: HabitMonthRowData
  /** The squares to draw, already cut at today. */
  cells: HabitMonthCell[]
  color?: string
  projectName: string
  streak: number
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
        <span>{{ row.completed }}/{{ row.expected }}</span>
        <span class="habits__streak">
          <AppIcon name="flame" :size="13" />
          <span>{{ streak }}</span>
        </span>
      </p>
    </div>
    <div
      class="habits__strip"
      :style="{
        gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`,
        '--habit-color': color ?? 'var(--accent)',
      }"
    >
      <span
        v-for="cell in cells"
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
