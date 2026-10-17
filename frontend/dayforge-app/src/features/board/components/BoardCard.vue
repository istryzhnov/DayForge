<script setup lang="ts">
import { computed } from 'vue'
import {
  PRIORITY,
  RECURRENCE_TYPE,
  TASK_STATUS,
} from '../../../entities/constants'
import { useIsCoarsePointer } from '../../../composables/useMediaQuery'
import { usePressGesture } from '../../../composables/usePressGesture'
import { useFormat } from '../../../composables/useFormat'
import {
  BOARD_COLUMNS,
  type BoardCard as BoardCardModel,
  type BoardColumn,
} from '../composables/boardModel'
import type { BoardCardDrag } from '../composables/useBoardDrag'

const props = defineProps<{
  card: BoardCardModel
  drag: BoardCardDrag
  isDragging: boolean
}>()

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'move', column: BoardColumn): void
}>()

const { formatDate, formatTime } = useFormat()
const isCoarsePointer = useIsCoarsePointer()

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

const row = computed(() => props.card.row)
const isDone = computed(() => row.value.status === TASK_STATUS.DONE)
const isMajor = computed(() => row.value.priority === PRIORITY.MAJOR)
const priorityLabel = computed(() => (isMajor.value ? 'Major' : 'Minor'))

const hasNotes = computed(() => !!props.card.template?.notes?.trim())

const repeats = computed(() => {
  const recurrence = props.card.template?.recurrence
  return !!recurrence && recurrence.type !== RECURRENCE_TYPE.NONE
})

/** A one-off task shows its date; a repeating one shows that it repeats. */
const scheduleLabel = computed(() => {
  const recurrence = props.card.template?.recurrence
  if (!recurrence) return ''
  const time = row.value.startTime ? ` ${formatTime(row.value.startTime)}` : ''
  if (repeats.value) return `Repeats${time}`
  const date = formatDate(recurrence.startDate, {
    month: 'short',
    day: 'numeric',
  })
  return `${date}${time}`
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
    }"
    :data-card-id="card.id"
    @pointerdown="onPointerDownCard"
  >
    <button
      type="button"
      class="board-card__body"
      :aria-label="`${row.title}, ${columnTitle}`"
      @click="emit('open')"
    >
      <span class="board-card__title" :class="{ 'task-done': isDone }">
        {{ row.title }}
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
          :title="repeats ? 'Repeats' : 'Scheduled date'"
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

        <span
          v-if="hasNotes"
          class="board-card__notes"
          role="img"
          aria-label="Has notes"
          title="Has notes"
        >
          ✎
        </span>
      </span>
    </button>

    <div class="board-card__foot">
      <label class="board-card__move">
        <span>Move to</span>
        <select :value="card.column" @change="onMoveChange">
          <option
            v-for="column in BOARD_COLUMNS"
            :key="column.key"
            :value="column.key"
          >
            {{ column.title }}
          </option>
        </select>
      </label>
    </div>
  </article>
</template>
