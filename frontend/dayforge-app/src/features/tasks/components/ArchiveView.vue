<script setup lang="ts">
import { ref } from 'vue'
import type { ArchivedTask } from '../composables/useArchive'
import { dayHeadingLabel, type DayGroup } from '../composables/dayGroups'
import { useFormat } from '../../../composables/useFormat'
import { formatTimeLabel } from '../../../composables/timer/format'
import AppIcon from '../../../components/AppIcon.vue'

defineProps<{
  days: DayGroup<ArchivedTask>[]
  totalDone: number
  doneThisWeek: number
  doneThisMonth: number
}>()

const { locale, uses12Hour, formatTime } = useFormat()

/** Explains the list on demand; the header stays one line. */
const showHint = ref(false)

/** When it was finished, or the planned start for a task finished without a stamp. */
function whenLabel(task: ArchivedTask): string {
  if (task.completedAt) {
    return formatTimeLabel(task.completedAt, locale.value, uses12Hour.value)
  }
  return formatTime(task.startTime)
}
</script>

<template>
  <section class="goal-panel">
    <header class="goal-panel-header">
      <div class="goal-panel-header__main">
        <div class="goal-panel-header__title">
          <h2>What I did</h2>
        </div>

        <ul class="goal-panel-stats">
          <li class="goal-panel-stats__item">
            <AppIcon name="check" :size="14" />
            <span class="ui-oneline">{{ totalDone }} completed</span>
          </li>
          <li class="goal-panel-stats__item">
            <AppIcon name="calendar" :size="14" />
            <span class="ui-oneline">{{ doneThisWeek }} this week</span>
          </li>
          <li class="goal-panel-stats__item">
            <AppIcon name="calendar" :size="14" />
            <span class="ui-oneline">{{ doneThisMonth }} this month</span>
          </li>
        </ul>
      </div>

      <div class="goal-panel-header__aside">
        <button
          class="ui-icon-btn ui-icon-btn--outlined"
          :class="{ 'is-active': showHint }"
          type="button"
          aria-label="About this list"
          title="About this list"
          :aria-expanded="showHint"
          @click="showHint = !showHint"
        >
          <AppIcon name="info" :size="16" />
        </button>
      </div>
    </header>

    <p v-if="showHint" class="day-list__hint">
      Finished tasks, newest first, one card per day.
    </p>

    <div v-if="days.length" class="day-list">
      <section v-for="day in days" :key="day.date" class="day-group">
        <header class="day-group__head">
          <span class="day-group__title ui-oneline">
            {{ dayHeadingLabel(day.date) }}
          </span>
          <span class="day-group__count">{{ day.items.length }} done</span>
        </header>

        <div class="ui-card day-group__card">
          <div v-for="task in day.items" :key="task.id" class="day-row">
            <span class="day-row__check">
              <AppIcon name="check" :size="12" />
            </span>

            <div class="day-row__copy">
              <span class="task-title task-done ui-oneline">
                {{ task.title }}
              </span>

              <p v-if="whenLabel(task)" class="task-when ui-oneline">
                {{ whenLabel(task) }}
              </p>

              <div class="task-meta">
                <span class="task-project-name ui-oneline">
                  <span
                    class="task-project-name__dot"
                    :style="
                      task.goalColor
                        ? { background: task.goalColor }
                        : undefined
                    "
                    aria-hidden="true"
                  />
                  {{ task.goalTitle }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <p v-else class="task-empty">Nothing completed yet.</p>
  </section>
</template>
