<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PlannedTask } from '../composables/usePlannedTasks'
import type { ID, ISODate } from '../../../entities/types'
import { useFormat } from '../../../composables/useFormat'
import AppIcon from '../../../components/AppIcon.vue'
import { dayHeadingLabel, groupByDay } from '../composables/dayGroups'

const props = defineProps<{
  tasks: PlannedTask[]
}>()

const emit = defineEmits<{
  (e: 'toggle', templateId: ID, date: ISODate): void
}>()

const { formatTime } = useFormat()

/** Explains the list on demand; the header stays one line. */
const showHint = ref(false)

const days = computed(() => groupByDay(props.tasks))
const todayCount = computed(
  () => props.tasks.filter((task) => task.isToday).length,
)
const overdueCount = computed(
  () => props.tasks.filter((task) => task.isOverdue).length,
)

/** Overdue, repeat and time on one muted line under the title. */
function whenLine(task: PlannedTask): string {
  const repeat = task.isAnnual ? 'Every year' : task.repeatLabel
  const time = task.startTime ? formatTime(task.startTime) : ''
  return [task.isOverdue ? 'Overdue' : '', repeat ?? '', time]
    .filter(Boolean)
    .join(' · ')
}
</script>

<template>
  <section class="goal-panel">
    <header class="goal-panel-header">
      <div class="goal-panel-header__main">
        <div class="goal-panel-header__title">
          <h2>Planned tasks</h2>
        </div>

        <ul class="goal-panel-stats">
          <li class="goal-panel-stats__item">
            <AppIcon name="calendar" :size="14" />
            <span class="ui-oneline">{{ tasks.length }} planned</span>
          </li>
          <li v-if="todayCount" class="goal-panel-stats__item">
            <AppIcon name="check" :size="14" />
            <span class="ui-oneline">{{ todayCount }} today</span>
          </li>
          <li v-if="overdueCount" class="goal-panel-stats__item">
            <AppIcon name="bell" :size="14" />
            <span class="ui-oneline">{{ overdueCount }} overdue</span>
          </li>
        </ul>
      </div>

      <div class="goal-panel-header__aside">
        <button
          class="ui-icon-btn ui-icon-btn--outlined"
          :class="{ 'is-active': showHint }"
          type="button"
          aria-label="About planned tasks"
          title="About planned tasks"
          :aria-expanded="showHint"
          @click="showHint = !showHint"
        >
          <AppIcon name="info" :size="16" />
        </button>
      </div>
    </header>

    <p v-if="showHint" class="day-list__hint">
      Dated tasks from every project, earliest first. A finished task stays here
      only on its own day.
    </p>

    <div v-if="tasks.length" class="day-list">
      <section v-for="day in days" :key="day.date" class="day-group">
        <header class="day-group__head">
          <span class="day-group__title ui-oneline">
            {{ dayHeadingLabel(day.date)
            }}<template v-if="day.items[0].isToday"> · Today</template>
          </span>
          <span class="day-group__count">
            {{ day.items.length }}
            {{ day.items.length === 1 ? 'task' : 'tasks' }}
          </span>
        </header>

        <div class="ui-card day-group__card">
          <div
            v-for="task in day.items"
            :key="task.templateId"
            class="day-row"
            :class="{ 'is-overdue': task.isOverdue }"
          >
            <button
              type="button"
              class="task-dot-check"
              :class="{ 'is-done': task.isDone }"
              :aria-label="task.isDone ? 'Mark as not done' : 'Mark as done'"
              @click="emit('toggle', task.templateId, task.date)"
            >
              <AppIcon
                v-if="task.isDone"
                class="task-dot-check__mark"
                name="check"
                :size="14"
              />
            </button>

            <div class="day-row__copy">
              <span
                class="task-title ui-oneline"
                :class="{ 'task-done': task.isDone }"
              >
                {{ task.title }}
              </span>

              <p v-if="whenLine(task)" class="task-when ui-oneline">
                <AppIcon
                  v-if="task.isAnnual || task.repeatLabel"
                  name="repeat"
                  :size="11"
                />
                {{ whenLine(task) }}
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

    <p v-else class="task-empty">No planned tasks.</p>
  </section>
</template>
