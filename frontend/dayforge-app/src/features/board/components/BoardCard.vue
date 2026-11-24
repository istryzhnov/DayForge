<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ID } from '../../../entities/types'
import { useIsCoarsePointer } from '../../../shared/composables/useMediaQuery'
import { usePressGesture } from '../../../shared/composables/usePressGesture'
import { useFormat } from '../../../shared/composables/useFormat'
import { useTimer } from '../../../shared/composables/useTimer'
import { useTimeEntries } from '../../../shared/composables/useTimeEntries'
import { formatShortDuration } from '../../../shared/composables/timer/format'
import { durationWords } from '../../../shared/composables/timer/text'
import { useToday } from '../../../shared/composables/goalSpace/today'
import AppIcon from '../../../shared/ui/AppIcon.vue'
import {
  type BoardColumnDef,
  BOARD_COLUMN,
  type BoardCard as BoardCardModel,
  type BoardColumn,
} from '../composables/boardModel'
import type { BoardCardDrag } from '../composables/useBoardDrag'
import { useBoardCardMenu } from '../composables/useBoardCardMenu'
import {
  TaskContextMenu,
  TaskInlineEditor,
  TaskNotesButton,
  TaskRateEditor,
  useTaskActions,
} from '../../tasks'
import { TaskTimerButton, toggleTaskTimer } from '../../timer'

const props = defineProps<{
  card: BoardCardModel
  drag: BoardCardDrag
  isDragging: boolean
  /** This board's columns, the project's own included, for "Move to". */
  columns: ReadonlyArray<BoardColumnDef>
  /** The project's hourly rate, the fallback a card's own rate replaces. */
  projectRate?: number
}>()

const emit = defineEmits<{
  (e: 'move', column: BoardColumn): void
  (e: 'save-notes', notes: string): void
  (e: 'delete'): void
  /** "Move to…" from the menu: the page opens the move dialog. */
  (e: 'move-task', templateId: ID): void
}>()

const { formatDate, formatTime } = useFormat()
const { t } = useI18n()
const today = useToday()
const isCoarsePointer = useIsCoarsePointer()
const timer = useTimer()
const timeEntries = useTimeEntries()
const actions = useTaskActions()

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
const isTiming = computed(() => timer.isActiveTask(props.card.templateId))

/** The card's own time plus its subtasks', the same total the list shows. */
const trackedLabel = computed(() => {
  const ms = timeEntries.totalForTasks([
    props.card.templateId,
    ...props.card.childTemplateIds,
  ])
  return ms > 0 ? formatShortDuration(ms, durationWords()) : ''
})

const notesButton =
  useTemplateRef<InstanceType<typeof TaskNotesButton>>('notesButton')
/** Set from the menu: the notes button shows while its popover is open. */
const notesRequested = ref(false)
const hasNotes = computed(() => !!props.card.template.notes?.trim())
const showNotes = computed(() => hasNotes.value || notesRequested.value)

// The same menu and editors the list's rows open.
const {
  contextMenuPos,
  isEditing,
  isRateEditing,
  editorStartsScheduled,
  hasOwnRate,
  notesOn,
  node,
  toggleCheck,
  openContextMenu,
  closeContextMenu,
  openEditor,
  closeEditor,
  openRateEditor,
  closeRateEditor,
  saveRate,
  saveEdits,
} = useBoardCardMenu(
  () => props.card,
  () => today.value,
  () => props.projectRate,
)

/** A click that ends a drag is not a request to open the card. */
function openCard() {
  if (props.drag.consumeClick()) return
  openEditor(false)
}

/** Overlay click or Escape closes whichever editor is open. */
function closeEditors() {
  closeEditor()
  closeRateEditor()
}

/** Desktop right-click; on touch a held card is a drag, so the ⋯ button covers it. */
function onContextMenu(event: MouseEvent) {
  if (isCoarsePointer.value) return
  event.preventDefault()
  openContextMenu(event)
}

/** Anchored under the ⋯ button, so the keyboard gets a sensible spot too. */
function openMenuFromButton(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  contextMenuPos.value = { x: rect.left, y: rect.bottom + 4 }
}

async function addNote() {
  notesRequested.value = true
  await nextTick()
  notesButton.value?.openPopover()
}

function onNotesClosed() {
  notesRequested.value = false
}

function toggleTimer() {
  toggleTaskTimer({
    taskId: props.card.templateId,
    taskTitle: props.card.title,
    goalId: props.card.template.goalId,
  })
}

/**
 * Today's card says nothing about the day; any other day is named, so a card
 * for tomorrow or an overdue one is easy to tell apart.
 */
const scheduleLabel = computed(() => {
  const { card } = props
  const time = card.startTime ? formatTime(card.startTime) : ''
  const isToday = card.date === today.value

  if (card.isRepeating) {
    if (!card.date) return t('tasks.repeats')
    const day = isToday
      ? ''
      : formatDate(card.date, { month: 'short', day: 'numeric' })
    return [t('tasks.repeats'), day && `· ${day}`, time]
      .filter(Boolean)
      .join(' ')
  }

  if (!card.date) return time
  const day = isToday
    ? ''
    : formatDate(card.date, { month: 'short', day: 'numeric' })
  return [day, time].filter(Boolean).join(' ')
})

function titleOf(column: BoardColumnDef): string {
  return column.title ?? t(column.titleKey ?? '')
}

const columnTitle = computed(() => {
  const column = props.columns.find((item) => item.key === props.card.column)
  return column ? titleOf(column) : ''
})

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
    :data-tour-task="card.templateId"
    @pointerdown="onPointerDownCard"
    @contextmenu="onContextMenu"
  >
    <button
      type="button"
      class="board-card__body"
      :aria-label="
        t('board.cardLabel', { title: card.title, column: columnTitle })
      "
      @click="openCard"
    >
      <span class="board-card__title" :class="{ 'task-done': isDone }">
        {{ card.title }}
      </span>

      <span class="board-card__meta">
        <span class="board-card__priority" aria-hidden="true"></span>

        <span
          v-if="scheduleLabel"
          class="board-chip"
          :title="
            card.isRepeating ? t('tasks.repeats') : t('board.scheduledDate')
          "
        >
          {{ scheduleLabel }}
        </span>

        <span
          v-if="card.subtasksTotal"
          class="board-chip board-chip--count"
          :title="
            t('board.subtasksDone', {
              done: card.subtasksDone,
              total: card.subtasksTotal,
            })
          "
        >
          <AppIcon name="check" :size="11" />
          {{ card.subtasksDone }}/{{ card.subtasksTotal }}
        </span>

        <span
          v-if="isTiming"
          class="board-chip board-card__live"
          :title="t('board.runningNow')"
        >
          <span class="df-live-dot" aria-hidden="true"></span>
          {{ timer.displayLabel }}
        </span>
        <span
          v-else-if="trackedLabel"
          class="board-chip board-card__tracked"
          :title="t('board.trackedTime')"
        >
          {{ trackedLabel }}
        </span>
      </span>
    </button>

    <div class="board-card__foot">
      <TaskNotesButton
        v-if="showNotes"
        ref="notesButton"
        :notes="card.template.notes"
        :title="card.title"
        @save="(notes) => emit('save-notes', notes)"
        @close="onNotesClosed"
      />

      <!-- Stopped here so a press on the timer never starts a drag. -->
      <TaskTimerButton
        class="board-card__timer"
        :task-id="card.templateId"
        :title="card.title"
        :goal-id="card.template.goalId"
        :rollup-task-ids="card.childTemplateIds"
        @pointerdown.stop
      />

      <button
        type="button"
        class="board-card__more"
        :aria-label="t('board.moreActions')"
        aria-haspopup="menu"
        :title="t('board.moreActions')"
        @pointerdown.stop
        @click.stop="openMenuFromButton"
      >
        <AppIcon name="more-horizontal" :size="16" />
      </button>

      <label class="board-card__move">
        <span>{{ t('board.moveTo') }}</span>
        <select :value="card.column" @change="onMoveChange">
          <option
            v-for="column in columns"
            :key="column.key"
            :value="column.key"
            :disabled="column.key === BOARD_COLUMN.DONE && !card.canFinish"
          >
            {{ titleOf(column) }}
          </option>
        </select>
      </label>
    </div>
    <!-- A card is too narrow for the editor, so it opens as a dialog over the board. -->
    <Teleport to="body">
      <div
        v-if="isEditing || isRateEditing"
        class="new-goal-modal"
        @click.self="closeEditors"
      >
        <div class="modal-overlay" @click="closeEditors"></div>
        <div
          class="modal-card board-card-editor"
          role="dialog"
          aria-modal="true"
          :aria-label="card.title"
        >
          <TaskInlineEditor
            v-if="isEditing"
            :node="node"
            :open-scheduled="editorStartsScheduled"
            @save="(payload) => saveEdits(payload.title, payload.schedule)"
            @close="closeEditor"
          />
          <TaskRateEditor
            v-if="isRateEditing"
            :node="node"
            @save="(hourlyRate) => saveRate(hourlyRate)"
            @close="closeRateEditor"
          />
        </div>
      </div>
    </Teleport>

    <!-- Teleported, so a card's transform never pulls the menu out of place. -->
    <Teleport to="body">
      <TaskContextMenu
        v-if="contextMenuPos"
        :x="contextMenuPos.x"
        :y="contextMenuPos.y"
        :is-done="isDone"
        :can-add-child="false"
        :can-notes="notesOn"
        :has-children="false"
        :can-move="true"
        :is-scheduled="!!node.task.startTime"
        :has-own-rate="hasOwnRate"
        :has-notes="hasNotes"
        :is-timer-active="isTiming"
        @edit="openEditor(false)"
        @schedule="openEditor(true)"
        @set-rate="openRateEditor"
        @add-note="addNote"
        @toggle-timer="toggleTimer"
        @move="emit('move-task', card.templateId)"
        @nudge="(step) => actions.nudge(card.templateId, step)"
        @delete="emit('delete')"
        @toggle-check="toggleCheck"
        @close="closeContextMenu"
      />
    </Teleport>
  </article>
</template>
