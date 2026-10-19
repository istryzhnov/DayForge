<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID, ISODate } from '../../../entities/types'
import { GOAL_STATUS } from '../../../entities/constants'
import DisclosureSection from '../../../components/DisclosureSection.vue'
import { readJson, writeJson } from '../../../lib/storage'
import { projectColors } from '../../../composables/theme/goalTheme'
import { useFormat } from '../../../composables/useFormat'
import {
  collectUpcoming,
  UPCOMING_WINDOW_DAYS,
  type UpcomingItem,
} from '../composables/useUpcomingTasks'

const props = defineProps<{
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
  goals: Goal[]
  /** The project in view; `null` lists every project (All Tasks). */
  goalId: ID | null
  /** The viewed date. The list starts the day after it. */
  fromDate: ISODate
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

// A paused or archived project does not fire its repeats, so it is left out.
const pausedGoalIds = computed(
  () =>
    new Set(
      props.goals
        .filter((goal) => goal.status !== GOAL_STATUS.ACTIVE)
        .map((goal) => goal.id),
    ),
)

const days = computed(() => {
  const paused = pausedGoalIds.value
  const isLive = (goalId: ID | undefined) => !goalId || !paused.has(goalId)

  return collectUpcoming(
    props.templates.filter((template) => isLive(template.goalId)),
    props.dailyTasks.filter((row) => isLive(row.goalId)),
    props.fromDate,
    UPCOMING_WINDOW_DAYS,
    props.goalId,
  )
})

const colorByGoal = computed(() => projectColors(props.goals))

function dotStyle(goalId: ID | undefined) {
  const color = goalId ? colorByGoal.value.get(goalId) : undefined
  return color ? { '--upcoming-dot': color } : undefined
}

function dayLabel(date: ISODate) {
  return formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })
}

function timeRange(item: UpcomingItem) {
  if (!item.startTime) return ''
  if (!item.endTime) return formatTime(item.startTime)
  return `${formatTime(item.startTime)} – ${formatTime(item.endTime)}`
}

/** The next occurrence of a repeat, e.g. "Tue 20". */
function nextLabel(date: ISODate) {
  return formatDate(date, { weekday: 'short', day: 'numeric' })
}
</script>

<template>
  <div v-if="days.length" class="upcoming">
    <DisclosureSection label="Upcoming" :open="isOpen" @toggle="onToggle">
      <div class="upcoming__days">
        <section v-for="day in days" :key="day.date" class="upcoming-day">
          <h3 class="upcoming-day__label">{{ dayLabel(day.date) }}</h3>

          <ul class="upcoming-day__list">
            <li v-for="item in day.items" :key="item.key">
              <button
                type="button"
                class="upcoming-row"
                :class="{ 'is-done': item.isDone }"
                :style="dotStyle(item.goalId)"
                :title="`Show ${dayLabel(item.date)}`"
                @click="emit('select-date', item.date)"
              >
                <span class="upcoming-row__dot" aria-hidden="true"></span>

                <span class="upcoming-row__copy">
                  <span class="upcoming-row__title">{{ item.title }}</span>

                  <span class="upcoming-row__meta">
                    <span v-if="timeRange(item)" class="upcoming-row__time">
                      {{ timeRange(item) }}
                    </span>

                    <template v-if="item.repeatLabel">
                      <span class="task-repeat-chip">Repeats</span>
                      <span class="upcoming-row__rule">
                        {{ item.repeatLabel }} · next
                        {{ nextLabel(item.date) }}
                      </span>
                    </template>
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </DisclosureSection>
  </div>
</template>
