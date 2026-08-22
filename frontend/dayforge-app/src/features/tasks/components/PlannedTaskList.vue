<script setup lang="ts">
import type { PlannedTask } from '../composables/usePlannedTasks'
import type { ID, ISODate } from '../../../entities/types'
import { parseISODate } from '../../../composables/goalSpace/date'

defineProps<{
  tasks: PlannedTask[]
}>()

const emit = defineEmits<{
  (e: 'toggle', templateId: ID, date: ISODate): void
}>()

function dayLabel(date: ISODate) {
  return parseISODate(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}
</script>

<template>
  <section class="goal-panel">
    <header class="goal-panel-header">
      <div>
        <h2>Planned tasks</h2>
        <p>Dated commitments across every goal</p>
      </div>
    </header>

    <div v-if="tasks.length" class="task-list">
      <div
        v-for="task in tasks"
        :key="task.templateId"
        class="task-row planned-task"
        :class="{ 'is-overdue': task.isOverdue }"
      >
        <div class="task-main">
          <button
            type="button"
            class="task-dot-check"
            :class="{ 'is-done': task.isDone }"
            :aria-label="task.isDone ? 'Mark as not done' : 'Mark as done'"
            @click="emit('toggle', task.templateId, task.date)"
          >
            <span v-if="task.isDone" class="task-dot-check__mark">✓</span>
          </button>

          <div class="task-copy">
            <span class="task-title" :class="{ 'task-done': task.isDone }">
              {{ task.title }}
            </span>

            <div class="task-meta">
              <span class="goal-inline-chip">{{ task.goalTitle }}</span>

              <!-- When it is due, right next to the goal tag. -->
              <span
                class="planned-task__when"
                :class="{ 'is-overdue': task.isOverdue }"
              >
                <template v-if="task.isOverdue">
                  Overdue · was due {{ dayLabel(task.date) }}
                </template>
                <template v-else-if="task.isToday">
                  Today{{ task.startTime ? ` · ${task.startTime}` : '' }}
                </template>
                <template v-else>
                  {{ dayLabel(task.date)
                  }}{{ task.startTime ? ` · ${task.startTime}` : '' }}
                </template>
              </span>

              <span v-if="task.isAnnual" class="task-repeat-chip">
                Every year
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-else class="task-empty">
      No planned tasks. Add one by scheduling a task for a specific date.
    </p>
  </section>
</template>
