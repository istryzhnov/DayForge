<script setup lang="ts">
import { computed } from 'vue'
import { PRIORITY } from '../../../entities/constants'
import { useIsCoarsePointer } from '../../../composables/useMediaQuery'
import { usePressGesture } from '../../../composables/usePressGesture'
import { useFormat } from '../../../composables/useFormat'
import { useTimer } from '../../../composables/useTimer'
import { getTodayISODate } from '../../../composables/goalSpace/date'
import {
  BOARD_COLUMNS,
  BOARD_COLUMN,
  type BoardCard as BoardCardModel,
  type BoardColumn,
} from '../composables/boardModel'
import type { BoardCardDrag } from '../composables/useBoardDrag'
import TaskNotesButton from '../../tasks/components/TaskNotesButton.vue'
import TaskTimerButton from '../../timer/components/TaskTimerButton.vue'

const props = defineProps<{
  card: BoardCardModel
  drag: BoardCardDrag
  isDragging: boolean
}>()

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'move', column: BoardColumn): void
  (e: 'save-notes', notes: string): void
}>()

const { formatDate, formatTime } = useFormat()
const isCoarsePointer = useIsCoarsePointer()
const timer = useTimer()

// On touch a held card is picked up and follows the finger; a quick tap is
// still a tap, and a sideways swipe still scrolls the columns.
const { isLifted, onPointerDown } = usePressGesture({
  isEnabled: () => isCoarsePointer.value,
  onLift: (point) => props.drag.begin(point),
  onDragMove: (point) => props.drag.move(point),
  onDrop: () => props.drag.drop(),
  onCancel: () => props.drag.cancel(),
})

function onPointerDownCard(event: PointerEvent) {
  onPointerDown(event)
  props.drag.startWithMouse(event)
}

const isDone = computed(() => props.card.done)
const isMajor = computed(() => props.card.priority === PRIORITY.MAJOR)
const priorityLabel = computed(() => (isMajor.value ? 'Major' : 'Minor'))
const isTiming = computed(() => timer.isActiveTask(props.card.templateId))

/**
 * Today's card says nothing about the day; any other day is named, so a card
 * for tomorrow or an overdue one is easy to tell apart.
 */
const scheduleLabel = computed(() => {
  const { card } = props
  const time = card.startTime ? formatTime(card.startTime) : ''
  const isToday = card.date === getTodayISODate()

  if (card.isRepeating) {
    if (!card.date) return 'Repeats'
    const day = isToday
      ? ''
      : formatDate(card.date, { month: 'short', day: 'numeric' })
    return ['Repeats', day && `· ${day}`, time].filter(Boolean).join(' ')
  }

  if (!card.date) return time
  const day = isToday
    ? ''
    : formatDate(card.date, { month: 'short', day: 'numeric' })
  return [day, time].filter(Boolean).join(' ')
})

const columnTitle = computed(
  () => BOARD_COLUMNS.find((column) => column.key === props.card.column)?.title,
)

function onMoveChange(event: Event) {
  emit('move', (event.target as HTMLSelectElement).value as BoardColumn)
}
</script>

<template>
  <article
    class="board-card"
    :class="{
      'is-done': isDone,
      'is-lifted': isLifted,
      'is-dragging': isDragging,
      'is-timing': isTiming,
    }"
    :data-card-id="card.id"
    @pointerdown="onPointerDownCard"
  >
    <button
      type="button"
      class="board-card__body"
      :aria-label="`${card.title}, ${columnTitle}`"
      @click="emit('open')"
    >
      <span class="board-card__title" :class="{ 'task-done': isDone }">
        {{ card.title }}
      </span>

      <span class="board-card__meta">
        <span
          class="board-card__priority"
          :class="{ 'is-major': isMajor }"
          role="img"
          :aria-label="`${priorityLabel} priority`"
          :title="`${priorityLabel} priority`"
        ></span>

        <span
          v-if="scheduleLabel"
          class="board-chip"
          :title="card.isRepeating ? 'Repeats' : 'Scheduled date'"
        >
          {{ scheduleLabel }}
        </span>

        <span
          v-if="card.subtasksTotal"
          class="board-chip"
          :title="`${card.subtasksDone} of ${card.subtasksTotal} subtasks done`"
        >
          ✓ {{ card.subtasksDone }}/{{ card.subtasksTotal }}
        </span>
      </span>
    </button>

    <div class="board-card__foot">
      <TaskNotesButton
        :notes="card.template.notes"
        :title="card.title"
        @save="(notes) => emit('save-notes', notes)"
      />

      <!-- Stopped here so a press on the timer never starts a drag. -->
      <span class="board-card__timer" @pointerdown.stop>
        <TaskTimerButton
          :task-id="card.templateId"
          :title="card.title"
          :goal-id="card.template.goalId"
          :rollup-task-ids="card.childTemplateIds"
        />
      </span>

      <label class="board-card__move">
        <span>Move to</span>
        <select :value="card.column" @change="onMoveChange">
          <option
            v-for="column in BOARD_COLUMNS"
            :key="column.key"
            :value="column.key"
            :disabled="column.key === BOARD_COLUMN.DONE && !card.canFinish"
          >
            {{ column.title }}
          </option>
        </select>
      </label>
    </div>
  </article>
</template>
