<script setup lang="ts">
import type { TimeEntry } from '../../../entities/TimerEntity'
import AppIcon from '../../../components/AppIcon.vue'
import { useTimerHistory } from '../composables/useTimerHistory'

const emit = defineEmits<{ (e: 'edit', entry: TimeEntry): void }>()

const {
  days,
  removeEntry,
  timeRange,
  durationLabel,
  kindLabel,
  dayLabel,
  dayTotalLabel,
} = useTimerHistory()
</script>

<template>
  <div class="timer-history">
    <p v-if="days.length === 0" class="timer-history__empty">
      Nothing recorded yet.
    </p>

    <section v-for="group in days" :key="group.date" class="timer-history__day">
      <header class="timer-history__day-head">
        <span class="timer-history__day-title ui-oneline">{{
          dayLabel(group)
        }}</span>
        <span class="timer-history__day-total">{{ dayTotalLabel(group) }}</span>
      </header>

      <div class="ui-card timer-history__list">
        <div v-for="entry in group.entries" :key="entry.id" class="timer-entry">
          <div class="timer-entry__main">
            <span class="timer-entry__title ui-oneline">
              {{ entry.taskTitle ?? 'No task' }}
            </span>
            <span class="timer-entry__meta ui-oneline">
              {{ timeRange(entry) }} · {{ kindLabel(entry) }}
            </span>
            <span v-if="entry.note" class="timer-entry__meta ui-oneline">
              {{ entry.note }}
            </span>
          </div>

          <span class="timer-entry__duration">{{ durationLabel(entry) }}</span>

          <div class="timer-entry__actions">
            <button
              class="ui-icon-btn"
              type="button"
              aria-label="Edit entry"
              title="Edit entry"
              @click="emit('edit', entry)"
            >
              <AppIcon name="pencil" :size="14" />
            </button>
            <button
              class="ui-icon-btn"
              type="button"
              aria-label="Delete entry"
              title="Delete entry"
              @click="removeEntry(entry.id)"
            >
              <AppIcon name="close" :size="14" />
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
