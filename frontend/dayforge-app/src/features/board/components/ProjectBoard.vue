<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DailyTask, TaskSchedule, TaskTemplate } from '../../../entities/TaskEntity'
import type { BoardStage } from '../../../entities/constants'
import type { ID, Priority } from '../../../entities/types'
import { useSettings } from '../../../composables/useSettings'
import type { TaskNode } from '../../../composables/useTaskTree'
import TaskInlineEditor from '../../tasks/components/TaskInlineEditor.vue'
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
  /** The day's rows for the open project, as the list reads them. */
  tasks: DailyTask[]
  templates: TaskTemplate[]
}>()

const emit = defineEmits<{
  (e: 'toggle-done', dailyTaskId: ID): void
  (e: 'set-board-stage', templateId: ID, stage: BoardStage | undefined): void
  (e: 'add-task', title: string, priority: Priority): void
  (e: 'edit-task', templateId: ID, title: string): void
  (e: 'edit-notes', templateId: ID, notes: string): void
  (e: 'schedule-task', templateId: ID, schedule: TaskSchedule | null): void
}>()

const { settings } = useSettings()

const cards = computed(() => buildBoardCards(props.tasks, props.templates))

const templateById = computed(
  () => new Map(props.templates.map((template) => [template.id, template])),
)

const EMPTY_TEXT: Record<BoardColumn, string> = {
  [BOARD_COLUMN.TODO]: 'Nothing to do yet.',
  [BOARD_COLUMN.DOING]: 'Nothing in progress.',
  [BOARD_COLUMN.DONE]: 'Finished tasks land here.',
}

/**
 * One place for every move, whether it came from a drop or from the "Move to"
 * select. Done goes through the same toggle as the checkbox in the list.
 */
function moveCard(cardId: ID, column: BoardColumn) {
  const row = props.tasks.find((item) => item.id === cardId)
  if (!row) return

  const template = templateById.value.get(row.templateId)
  const plan = planBoardMove(row, template, column)

  if (plan.toggleDone) emit('toggle-done', row.id)

  if (plan.stage !== undefined) {
    const next = plan.stage ?? undefined
    if ((template?.boardStage ?? undefined) !== next) {
      emit('set-board-stage', row.templateId, next)
    }
  }
}

const drag = useBoardDrag((cardId, column) => moveCard(cardId, column))

// --- editing: the same editor the list opens -----------------------------

const editing = ref<BoardCardModel | null>(null)

/** A click that ends a drag is not a request to open the card. */
function openCard(card: BoardCardModel) {
  if (drag.consumeDragClick()) return
  editing.value = card
}

const editingNode = computed<TaskNode | null>(() => {
  if (!editing.value) return null
  return { task: editing.value.row, template: editing.value.template }
})

function saveEdits(title: string, schedule: TaskSchedule | null) {
  const card = editing.value
  editing.value = null
  if (!card) return

  // Same rules as the list: an unchanged title is not an edit.
  if (title !== card.row.title) {
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
  <section class="project-board" aria-label="Project board">
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
          <h3 :id="`board-column-${column.key}`">{{ column.title }}</h3>
          <span class="board-column__count">{{ cards[column.key].length }}</span>
        </header>

        <ul class="board-column__list">
          <li v-for="card in cards[column.key]" :key="card.id">
            <BoardCard
              :card="card"
              :drag="drag.forCard(card.id)"
              :is-dragging="drag.draggingId.value === card.id"
              @open="openCard(card)"
              @move="(target) => moveCard(card.id, target)"
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
          {{ EMPTY_TEXT[column.key] }}
        </p>

        <div v-if="column.key === BOARD_COLUMN.TODO" class="board-add">
          <button
            v-if="!adding"
            type="button"
            class="board-add__btn"
            @click="startAdd"
          >
            + Add
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
              placeholder="Task title"
              aria-label="New task title"
              autofocus
            />
            <div class="board-add__actions">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="!draft.trim()"
              >
                Add
              </button>
              <button type="button" class="btn btn-ghost" @click="stopAdd">
                Close
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>

    <TaskInlineEditor
      v-if="editingNode"
      :node="editingNode"
      @save="(payload) => saveEdits(payload.title, payload.schedule)"
      @save-notes="
        (notes) =>
          editingNode && emit('edit-notes', editingNode.task.templateId, notes)
      "
      @close="editing = null"
    />
  </section>
</template>
