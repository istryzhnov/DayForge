<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID, ISODate } from '../../../entities/types'
import AppIcon from '../../../components/AppIcon.vue'
import { readJson, writeJson } from '../../../lib/storage'
import { projectColors } from '../../../composables/theme/goalTheme'
import { useFormat } from '../../../composables/useFormat'
import type {
  UpcomingDay,
  UpcomingItem,
} from '../composables/useUpcomingTasks'

const props = defineProps<{
  /** Already narrowed to the project in view (or every project). */
  days: UpcomingDay[]
  goals: Goal[]
}>()

const emit = defineEmits<{
  (e: 'select-date', date: ISODate): void
}>()

const { formatDate, formatTime } = useFormat()

const COLLAPSED_KEY = 'dayforge-upcoming-collapsed-v1'

// Remembered per device; a storage failure just means it opens expanded.
const isOpen = ref(!readJson<boolean>(COLLAPSED_KEY, false))

function onToggle(event: Event) {
  const open = (event.currentTarget as HTMLDetailsElement).open
  if (open === isOpen.value) return
  isOpen.value = open
  writeJson(COLLAPSED_KEY, !open)
}

const colorByGoal = computed(() => projectColors(props.goals))

function dotStyle(goalId: ID | undefined) {
  const color = goalId ? colorByGoal.value.get(goalId) : undefined
  return color ? { '--upcoming-dot': color } : undefined
}

/** Short day, e.g. "Thu 29". */
function dayLabel(date: ISODate) {
  return formatDate(date, { weekday: 'short', day: 'numeric' })
}

function timeRange(item: UpcomingItem) {
  if (!item.startTime) return ''
  if (!item.endTime) return formatTime(item.startTime)
  return `${formatTime(item.startTime)} – ${formatTime(item.endTime)}`
}
</script>

<template>
  <section class="ui-card upcoming">
    <details :open="isOpen" @toggle="onToggle">
      <summary class="ui-section-label upcoming__summary">Upcoming</summary>

      <ul class="upcoming__list">
        <template v-for="day in days" :key="day.date">
          <li
            v-for="item in day.items"
            :key="item.key"
            class="upcoming-row"
            :class="{ 'is-done': item.isDone }"
            :style="dotStyle(item.goalId)"
          >
            <button
              type="button"
              class="upcoming-row__btn"
              :title="`Show ${dayLabel(item.date)}`"
              @click="emit('select-date', item.date)"
            >
              <span class="upcoming-row__day">{{ dayLabel(item.date) }}</span>
              <span class="upcoming-row__time">{{ timeRange(item) }}</span>
              <span class="upcoming-row__dot" aria-hidden="true"></span>
              <span class="upcoming-row__title ui-oneline">{{ item.title }}</span>
              <span
                v-if="item.repeatLabel"
                class="upcoming-row__repeat"
                role="img"
                aria-label="Repeats"
              >
                <AppIcon name="repeat" :size="13" />
              </span>
            </button>
          </li>
        </template>
      </ul>
    </details>
  </section>
</template>
