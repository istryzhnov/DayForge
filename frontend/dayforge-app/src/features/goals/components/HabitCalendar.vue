<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
import type { HabitMonthView } from '../../../composables/analytics/habits'
import type { ID } from '../../../entities/types'
import { useHabitCalendar } from '../composables/useHabitCalendar'

const props = defineProps<{
  view: HabitMonthView
  /** Current run of done days per habit, keyed by template id. */
  streaks: Map<ID, number>
}>()

const { rangeLabel, summary, cellLabel } = useHabitCalendar(props)
</script>

<template>
  <section class="ui-card habit-card">
    <header class="habit-card__head">
      <h3 class="ui-section-label">Habits</h3>
      <span class="habit-card__summary">{{ summary }}</span>
    </header>

    <div v-for="row in view.rows" :key="row.templateId" class="habit-row">
      <div class="habit-row__head">
        <span class="habit-row__name ui-oneline">{{ row.title }}</span>
        <span class="habit-row__streak">
          <AppIcon name="flame" :size="13" />
          <span>{{ streaks.get(row.templateId) ?? 0 }}</span>
        </span>
      </div>

      <div
        class="habit-row__grid"
        :style="{
          gridTemplateColumns: `repeat(${row.cells.length}, minmax(0, 1fr))`,
        }"
      >
        <span
          v-for="cell in row.cells"
          :key="cell.date"
          class="habit-cell"
          :class="`is-${cell.state}`"
          role="img"
          :aria-label="cellLabel(cell.date, cell.state)"
          :title="cellLabel(cell.date, cell.state)"
        />
      </div>
    </div>

    <p class="habit-card__caption">{{ rangeLabel }} … today</p>
  </section>
</template>
