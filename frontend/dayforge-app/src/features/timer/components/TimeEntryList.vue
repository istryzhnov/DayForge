<script setup lang="ts">
import type { TimeEntry } from '../../../entities/TimerEntity'
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
      Nothing recorded yet. Run the timer, or add an entry by hand.
    </p>

    <section v-for="group in days" :key="group.date" class="timer-history__day">
      <header class="timer-history__day-head">
        <strong>{{ dayLabel(group) }}</strong>
        <span>{{ dayTotalLabel(group) }}</span>
      </header>

      <div
        v-for="entry in group.entries"
        :key="entry.id"
        class="timer-entry"
      >
        <div class="timer-entry__main">
          <span class="timer-entry__title">
            {{ entry.taskTitle ?? 'No task' }}
          </span>
          <span class="timer-entry__meta">
            {{ timeRange(entry) }} · {{ kindLabel(entry) }}
          </span>
          <span v-if="entry.note" class="timer-entry__note">
            {{ entry.note }}
          </span>
        </div>

        <span class="timer-entry__duration">{{ durationLabel(entry) }}</span>

        <div class="timer-entry__actions">
          <button
            class="timer-entry__action"
            type="button"
            aria-label="Edit entry"
            title="Edit entry"
            @click="emit('edit', entry)"
          >
            ✎
          </button>
          <button
            class="timer-entry__action"
            type="button"
            aria-label="Delete entry"
            title="Delete entry"
            @click="removeEntry(entry.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
