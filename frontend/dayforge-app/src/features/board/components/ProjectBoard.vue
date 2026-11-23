<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  DailyTask,
  TaskSchedule,
  TaskTemplate,
} from '../../../entities/TaskEntity'
import {
  BOARD_CUSTOM_COLUMN_LIMIT,
  PRIORITY,
  TASK_STATUS,
} from '../../../entities/constants'
import type { ID } from '../../../entities/types'
import { useSettings } from '../../../shared/composables/useSettings'
import {
  SETTINGS_SECTION,
  useSettingsPanel,
} from '../../../shared/composables/useSettingsPanel'
import type { TaskNode } from '../../../shared/composables/useTaskTree'
import { dailyTaskId } from '../../../shared/composables/goalSpace/date'
import { useToday } from '../../../shared/composables/goalSpace/today'
import { useTaskActions, TaskInlineEditor } from '../../tasks'
import DragGhost from '../../../shared/ui/DragGhost.vue'
import BoardCard from './BoardCard.vue'
import {
  BOARD_COLUMN,
  boardColumnsFor,
  buildBoardCards,
  planBoardMove,
  type BoardCard as BoardCardModel,
  type BoardColumn,
} from '../composables/boardModel'
import { useBoardDrag } from '../composables/useBoardDrag'
import type { BoardCustomColumn } from '../../../entities/GoalEntity'

const props = defineProps<{
  /** Daily rows of the project, from any day: the board is not per day. */
  rows: DailyTask[]
  /** The project's own tasks. */
  templates: TaskTemplate[]
  /** Columns the project added, drawn between In progress and Done. */
  customColumns?: BoardCustomColumn[]
}>()

const actions = useTaskActions()
const { settings } = useSettings()
const settingsPanel = useSettingsPanel()

// The real day, which moves on at midnight while the board stays open.
const today = useToday()

const columns = computed(() => boardColumnsFor(props.customColumns))
const customIds = computed(() =>
  (props.customColumns ?? []).map((column) => column.id),
)

const cards = computed(() =>
  buildBoardCards(props.rows, props.templates, today.value, customIds.value),
)

const allCards = computed<BoardCardModel[]>(() =>
  Object.values(cards.value).flat(),
)

/** The "+ Column" tile hides once the project has its maximum of own columns. */
const canAddColumn = computed(
  () => (props.customColumns ?? []).length < BOARD_CUSTOM_COLUMN_LIMIT,
)

/** Columns are edited in the project's settings, next to the board switch. */
function openColumnSettings() {
  settingsPanel.open(SETTINGS_SECTION.PROJECT)
}

const { t } = useI18n()

const EMPTY_TEXT_KEY: Record<BoardColumn, string> = {
  [BOARD_COLUMN.TODO]: 'board.emptyTodo',
  [BOARD_COLUMN.DOING]: 'board.emptyDoing',
  [BOARD_COLUMN.DONE]: 'board.emptyDone',
}

/** A project's own column reads like In progress when it is empty. */
function emptyTextKey(column: BoardColumn): string {
  return EMPTY_TEXT_KEY[column] ?? EMPTY_TEXT_KEY[BOARD_COLUMN.DOING]
}

function columnTitle(column: { title?: string; titleKey?: string }): string {
  return column.title ?? t(column.titleKey ?? '')
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
      actions.toggleDone(card.row.id)
    } else {
      // A repeating task finished for the first time today has no row yet.
      actions.togglePlanned(card.templateId, today.value)
    }
  }

  if (plan.stage !== undefined) {
    const next = plan.stage ?? undefined
    if ((card.template.boardStage ?? undefined) !== next) {
      actions.setBoardStage(card.templateId, next)
    }
  }
}

function clearDone() {
  const templateIds = cards.value.done.map((card) => card.templateId)
  if (templateIds.length) actions.clearBoardDone(templateIds)
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
  const date = card.date ?? today.value
  return {
    id: dailyTaskId(card.templateId, date),
    date,
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
    actions.editTitle(card.templateId, title)
  }
  actions.schedule(card.templateId, schedule)
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
  actions.addTask(title, settings.behavior.defaultPriority)
  // Stays open, so several tasks can be typed in a row.
  draft.value = ''
}
</script>

<template>
  <section class="project-board" :aria-label="t('board.projectBoard')">
    <div class="project-board__frame">
      <div class="project-board__columns">
        <section
          v-for="column in columns"
          :key="column.key"
          class="board-column"
          :class="{
            'is-drop-target': drag.dropColumn.value === column.key,
            'is-custom': column.custom,
          }"
          :data-board-column="column.key"
          :aria-labelledby="`board-column-${column.key}`"
        >
          <header class="board-column__head">
            <span class="board-column__dot" aria-hidden="true"></span>
            <h3 :id="`board-column-${column.key}`">
              {{ columnTitle(column) }}
            </h3>
            <span v-if="column.custom" class="board-column__tag">{{
              t('board.customTag')
            }}</span>
            <span class="board-column__count">{{
              cards[column.key]?.length ?? 0
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
            <li v-for="card in cards[column.key] ?? []" :key="card.id">
              <BoardCard
                :card="card"
                :columns="columns"
                :drag="drag.forCard(card.id)"
                :is-dragging="drag.draggingId.value === card.id"
                @open="openCard(card)"
                @move="(target) => moveCard(card.id, target)"
                @save-notes="
                  (notes) => actions.editNotes(card.templateId, notes)
                "
                @delete="actions.remove(card.templateId)"
              />
            </li>
          </ul>

          <p
            v-if="
              !cards[column.key]?.length &&
              !(column.key === BOARD_COLUMN.TODO && adding)
            "
            class="board-column__empty"
          >
            {{ t(emptyTextKey(column.key)) }}
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

      <button
        v-if="canAddColumn"
        type="button"
        class="board-add-column"
        :aria-label="t('board.addColumn')"
        @click="openColumnSettings"
      >
        + {{ t('board.addColumn') }}
      </button>
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
