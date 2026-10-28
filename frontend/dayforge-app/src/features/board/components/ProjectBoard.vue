<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  DailyTask,
  TaskSchedule,
  TaskTemplate,
} from '../../../entities/TaskEntity'
import {
  PRIORITY,
  TASK_STATUS,
  type BoardStage,
} from '../../../entities/constants'
import type { ID, ISODate, Priority } from '../../../entities/types'
import { useSettings } from '../../../composables/useSettings'
import type { TaskNode } from '../../../composables/useTaskTree'
import {
  dailyTaskId,
  getTodayISODate,
} from '../../../composables/goalSpace/date'
import TaskInlineEditor from '../../tasks/components/TaskInlineEditor.vue'
import DragGhost from '../../../components/DragGhost.vue'
import BoardCard from './BoardCard.vue'
import {
  BOARD_COLUMN,
  BOARD_COLUMNS,
  buildBoardCards,
  planBoardMove,
  type BoardCard as BoardCardModel,
  type BoardColumn,
} from '../composables/boardModel'
import { useBoardDrag } from '../composables/useBoardDrag'

const props = defineProps<{
  /** Daily rows of the project, from any day: the board is not per day. */
  rows: DailyTask[]
  /** The project's own tasks. */
  templates: TaskTemplate[]
}>()

const emit = defineEmits<{
  (e: 'toggle-done', dailyTaskId: ID): void
  (e: 'toggle-planned', templateId: ID, date: ISODate): void
  (e: 'set-board-stage', templateId: ID, stage: BoardStage | undefined): void
  (e: 'clear-done', templateIds: ID[]): void
  (e: 'add-task', title: string, priority: Priority): void
  (e: 'edit-task', templateId: ID, title: string): void
  (e: 'edit-notes', templateId: ID, notes: string): void
  (e: 'schedule-task', templateId: ID, schedule: TaskSchedule | null): void
  (e: 'delete-task', templateId: ID): void
}>()

const { settings } = useSettings()

const today = getTodayISODate()

const cards = computed(() =>
  buildBoardCards(props.rows, props.templates, today),
)

const allCards = computed<BoardCardModel[]>(() => [
  ...cards.value.todo,
  ...cards.value.doing,
  ...cards.value.done,
])

const { t } = useI18n()

const EMPTY_TEXT_KEY: Record<BoardColumn, string> = {
  [BOARD_COLUMN.TODO]: 'board.emptyTodo',
  [BOARD_COLUMN.DOING]: 'board.emptyDoing',
  [BOARD_COLUMN.DONE]: 'board.emptyDone',
}

/**
 * One place for every move, whether it came from a drop or from the "Move to"
 * select. Done goes through the same toggle as the checkbox in the list.
 */
function moveCard(cardId: ID, column: BoardColumn) {
  const card = allCards.value.find((item) => item.id === cardId)
  if (!card) return

  const plan = planBoardMove(card, column)

  if (plan.toggleDone) {
    if (card.row) {
      emit('toggle-done', card.row.id)
    } else {
      // A repeating task finished for the first time today has no row yet.
      emit('toggle-planned', card.templateId, today)
    }
  }

  if (plan.stage !== undefined) {
    const next = plan.stage ?? undefined
    if ((card.template.boardStage ?? undefined) !== next) {
      emit('set-board-stage', card.templateId, next)
    }
  }
}

function clearDone() {
  const templateIds = cards.value.done.map((card) => card.templateId)
  if (templateIds.length) emit('clear-done', templateIds)
}

const drag = useBoardDrag((cardId, column) => moveCard(cardId, column))

/** The card under the pointer, for the floating copy that follows it. */
const draggingCard = computed<BoardCardModel | null>(() => {
  const id = drag.draggingId.value
  if (id === null) return null
  return allCards.value.find((card) => card.id === id) ?? null
})

// --- editing: the same editor the list opens -----------------------------

const editing = ref<BoardCardModel | null>(null)

/** A click that ends a drag is not a request to open the card. */
function openCard(card: BoardCardModel) {
  if (drag.consumeDragClick()) return
  editing.value = card
}

/**
 * The editor reads the title and time from a row. A card with no row today
 * (a repeating task whose next day is ahead) is edited through a stand-in.
 */
function rowForEditing(card: BoardCardModel): DailyTask {
  if (card.row) return card.row
  return {
    id: dailyTaskId(card.templateId, card.date ?? today),
    date: card.date ?? today,
    templateId: card.templateId,
    title: card.title,
    priority: card.priority,
    goalId: card.template.goalId,
    tagIds: [],
    status: TASK_STATUS.TODO,
    startTime: card.startTime,
    endTime: card.template.endTime,
  }
}

const editingNode = computed<TaskNode | null>(() => {
  if (!editing.value) return null
  return {
    task: rowForEditing(editing.value),
    template: editing.value.template,
  }
})

function saveEdits(title: string, schedule: TaskSchedule | null) {
  const card = editing.value
  editing.value = null
  if (!card) return

  // Same rules as the list: an unchanged title is not an edit.
  if (title !== card.title) {
    emit('edit-task', card.templateId, title)
  }
  emit('schedule-task', card.templateId, schedule)
}

// --- adding: creates a task in this project, the same way the composer does

const adding = ref(false)
const draft = ref('')

function startAdd() {
  adding.value = true
}

function stopAdd() {
  adding.value = false
  draft.value = ''
}

function submitAdd() {
  const title = draft.value.trim()
  if (!title) return
  emit('add-task', title, settings.behavior.defaultPriority)
  // Stays open, so several tasks can be typed in a row.
  draft.value = ''
}
</script>

<template>
  <section class="project-board" :aria-label="t('board.projectBoard')">
    <div class="project-board__columns">
      <section
        v-for="column in BOARD_COLUMNS"
        :key="column.key"
        class="board-column"
        :class="{
          'is-drop-target': drag.dropColumn.value === column.key,
        }"
        :data-board-column="column.key"
        :aria-labelledby="`board-column-${column.key}`"
      >
        <header class="board-column__head">
          <h3 :id="`board-column-${column.key}`">{{ t(column.titleKey) }}</h3>
          <span class="board-column__count">{{
            cards[column.key].length
          }}</span>
          <button
            v-if="column.key === BOARD_COLUMN.DONE && cards.done.length"
            type="button"
            class="board-column__clear"
            :title="t('board.clearDoneHint')"
            @click="clearDone"
          >
            {{ t('board.clearDone') }}
          </button>
        </header>

        <ul class="board-column__list">
          <li v-for="card in cards[column.key]" :key="card.id">
            <BoardCard
              :card="card"
              :drag="drag.forCard(card.id)"
              :is-dragging="drag.draggingId.value === card.id"
              @open="openCard(card)"
              @move="(target) => moveCard(card.id, target)"
              @save-notes="
                (notes) => emit('edit-notes', card.templateId, notes)
              "
              @delete="emit('delete-task', card.templateId)"
            />
          </li>
        </ul>

        <p
          v-if="
            !cards[column.key].length &&
            !(column.key === BOARD_COLUMN.TODO && adding)
          "
          class="board-column__empty"
        >
          {{ t(EMPTY_TEXT_KEY[column.key]) }}
        </p>

        <div v-if="column.key === BOARD_COLUMN.TODO" class="board-add">
          <button
            v-if="!adding"
            type="button"
            class="board-add__btn"
            @click="startAdd"
          >
            {{ t('board.addTask') }}
          </button>

          <form
            v-else
            class="board-add__form"
            @submit.prevent="submitAdd"
            @keydown.esc="stopAdd"
          >
            <input
              v-model="draft"
              type="text"
              maxlength="200"
              :placeholder="t('board.taskTitle')"
              :aria-label="t('board.newTaskTitle')"
              autofocus
            />
            <div class="board-add__actions">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="!draft.trim()"
              >
                {{ t('common.add') }}
              </button>
              <button type="button" class="btn btn-ghost" @click="stopAdd">
                {{ t('common.close') }}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>

    <DragGhost
      v-if="draggingCard"
      :title="draggingCard.title"
      :x="drag.pointer.value.x"
      :y="drag.pointer.value.y"
      :is-major="draggingCard.priority === PRIORITY.MAJOR"
      :touch="drag.isTouchDrag.value"
    />

    <TaskInlineEditor
      v-if="editingNode"
      :node="editingNode"
      @save="(payload) => saveEdits(payload.title, payload.schedule)"
      @close="editing = null"
    />
  </section>
</template>
