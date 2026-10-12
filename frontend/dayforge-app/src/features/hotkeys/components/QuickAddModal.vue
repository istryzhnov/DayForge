<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import { GOAL_STATUS, PRIORITY } from '../../../entities/constants'
import { getTodayISODate } from '../../../composables/goalSpace/date'
import {
  parseQuickAdd,
  type QuickAddResult,
} from '../../../composables/quickAdd/parse'
import { projectColors } from '../../../composables/theme/goalTheme'
import { useHotkeyOverlay } from '../../../composables/useHotkeys'

const props = defineProps<{
  goals: Goal[]
  currentTitle: string
}>()

const emit = defineEmits<{
  (e: 'submit', result: QuickAddResult): void
}>()

const { closeOverlay } = useHotkeyOverlay()

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const text = ref('')

const openGoals = computed(() =>
  props.goals.filter((goal) => goal.status !== GOAL_STATUS.ARCHIVED),
)

const colors = computed(() => projectColors(openGoals.value))

const parsed = computed(() =>
  parseQuickAdd(text.value, {
    goals: openGoals.value,
    today: getTodayISODate(),
  }),
)

const dayLabel = computed(() => {
  const result = parsed.value
  if (!result.date) return ''
  return `${result.day === 'today' ? 'Today' : 'Tomorrow'} · ${result.date}`
})

function projectColor(goalId: string | null): string | undefined {
  return goalId ? colors.value.get(goalId) : undefined
}

function submit(keepOpen: boolean) {
  if (!parsed.value.title) return

  emit('submit', parsed.value)

  if (!keepOpen) {
    closeOverlay()
    return
  }

  text.value = ''
  void nextTick(() => inputRef.value?.focus())
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return

  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    closeOverlay()
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    submit(event.shiftKey)
  }
}

onMounted(() => inputRef.value?.focus())
</script>

<template>
  <Teleport to="body">
    <section
      class="quick-add-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Quick add task"
    >
      <div class="modal-overlay" @click="closeOverlay"></div>
      <div class="quick-add-card">
        <input
          ref="inputRef"
          v-model="text"
          class="quick-add-card__input"
          type="text"
          placeholder="Task title  #project  !  today  tomorrow"
          autocomplete="off"
          aria-label="Task title"
          @keydown="onKeydown"
        />

        <div class="quick-add-chips" aria-live="polite">
          <span
            v-if="parsed.goalTitle"
            class="quick-add-chip is-project"
            :style="{ '--chip-color': projectColor(parsed.goalId) }"
          >
            {{ parsed.goalTitle }}
          </span>
          <span v-else class="quick-add-chip is-muted">
            {{ currentTitle }}
          </span>
          <span v-if="parsed.priority === PRIORITY.MAJOR" class="quick-add-chip">
            Project
          </span>
          <span v-if="parsed.date" class="quick-add-chip">{{ dayLabel }}</span>
        </div>

        <p class="quick-add-card__hint">
          <kbd>Enter</kbd> add
          <kbd>Shift</kbd>+<kbd>Enter</kbd> add and keep open
          <kbd>Esc</kbd> close
        </p>

        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="closeOverlay">
            Cancel
          </button>
          <button
            class="btn btn-primary"
            type="button"
            :disabled="!parsed.title"
            @click="submit(false)"
          >
            Add task
          </button>
        </div>
      </div>
    </section>
  </Teleport>
</template>
