<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BoardCustomColumn, Goal } from '../../../entities/GoalEntity'
import { BOARD_CUSTOM_COLUMN_LIMIT } from '../../../entities/constants'
import { createId } from '../../../shared/composables/goalSpace/date'
import { BOARD_COLUMN_TITLE_MAX } from '../../../shared/composables/goalSpace/boardColumns'
import AppIcon from '../../../shared/ui/AppIcon.vue'

/**
 * A project's board columns. The three built-in ones are fixed; the project
 * can add its own stages (say, "On review"), which sit between In progress
 * and Done and behave like In progress. Removing one moves its cards to
 * In progress.
 */
const props = defineProps<{ goal: Goal }>()
const emit = defineEmits<{
  (e: 'update', columns: BoardCustomColumn[]): void
}>()

const { t } = useI18n()

const showInfo = ref(false)

const BUILT_IN = [
  'board.columnTodo',
  'board.columnDoing',
  'board.columnDone',
] as const

const custom = computed(() => props.goal.boardColumns ?? [])
const canAdd = computed(() => custom.value.length < BOARD_CUSTOM_COLUMN_LIMIT)

function add() {
  if (!canAdd.value) return
  emit('update', [
    ...custom.value,
    { id: createId('column'), title: t('settings.boardColumnNew') },
  ])
}

/** An emptied name keeps the old one rather than deleting the column. */
function rename(id: string, event: Event) {
  const title = (event.target as HTMLInputElement).value.trim()
  if (!title) {
    ;(event.target as HTMLInputElement).value =
      custom.value.find((column) => column.id === id)?.title ?? ''
    return
  }
  emit(
    'update',
    custom.value.map((column) =>
      column.id === id ? { ...column, title } : column,
    ),
  )
}

function remove(id: string) {
  emit(
    'update',
    custom.value.filter((column) => column.id !== id),
  )
}
</script>

<template>
  <div class="board-columns-editor ui-card">
    <p class="board-columns-editor__title">
      {{ t('settings.boardColumns') }}
      <button
        type="button"
        class="ui-icon-btn"
        :title="t('common.aboutThis')"
        :aria-label="t('common.aboutThis')"
        :aria-expanded="showInfo"
        @click="showInfo = !showInfo"
      >
        <AppIcon name="info" :size="16" />
      </button>
    </p>
    <p v-if="showInfo" class="board-columns-editor__hint">
      {{ t('settings.boardColumnsHint') }}
    </p>

    <ul class="board-columns-editor__list">
      <li
        v-for="key in BUILT_IN.slice(0, 2)"
        :key="key"
        class="board-columns-editor__row is-built-in"
      >
        <span class="board-columns-editor__name">{{ t(key) }}</span>
        <span class="board-columns-editor__badge">{{
          t('settings.boardColumnBuiltIn')
        }}</span>
      </li>

      <li
        v-for="column in custom"
        :key="column.id"
        class="board-columns-editor__row is-custom"
      >
        <input
          type="text"
          :value="column.title"
          :maxlength="BOARD_COLUMN_TITLE_MAX"
          :aria-label="t('settings.boardColumnName')"
          @change="rename(column.id, $event)"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
        />
        <button
          type="button"
          class="ui-icon-btn"
          :aria-label="t('settings.boardColumnRemove', { name: column.title })"
          :title="t('settings.boardColumnRemove', { name: column.title })"
          @click="remove(column.id)"
        >
          <AppIcon name="close" :size="14" />
        </button>
      </li>

      <li class="board-columns-editor__row is-built-in">
        <span class="board-columns-editor__name">{{ t(BUILT_IN[2]) }}</span>
        <span class="board-columns-editor__badge">{{
          t('settings.boardColumnBuiltIn')
        }}</span>
      </li>
    </ul>

    <button
      v-if="canAdd"
      type="button"
      class="board-columns-editor__add"
      @click="add"
    >
      <AppIcon name="plus" :size="14" />
      {{ t('settings.boardColumnAdd') }}
    </button>
  </div>
</template>
