<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import { GOAL_STATUS } from '../../../entities/constants'
import { getTodayISODate } from '../../../composables/goalSpace/date'
import {
  parseQuickAdd,
  type QuickAddResult,
} from '../../../composables/quickAdd/parse'
import { projectColors } from '../../../composables/theme/goalTheme'
import { useHotkeyOverlay } from '../../../composables/useHotkeys'
import { useFocusTrap } from '../../../composables/useFocusTrap'

const props = defineProps<{
  goals: Goal[]
  currentTitle: string
}>()

const emit = defineEmits<{
  (e: 'submit', result: QuickAddResult): void
}>()

const { t } = useI18n()
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
  if (result.day === 'date') return result.date
  return t('hotkeys.dayDate', {
    day: result.day === 'today' ? t('hotkeys.today') : t('hotkeys.tomorrow'),
    date: result.date,
  })
})

const caret = ref(0)
const highlighted = ref(0)
const dismissedFor = ref<string | null>(null)

/** The #word the caret sits in, if any: what the suggestion list completes. */
const projectToken = computed(() => {
  const before = text.value.slice(0, caret.value)
  const start = before.search(/\S*$/)
  const word = before.slice(start)
  if (!word.startsWith('#')) return null
  return { start, query: word.slice(1).toLowerCase() }
})

const suggestions = computed(() => {
  const token = projectToken.value
  if (!token || dismissedFor.value === text.value) return []
  const starts = openGoals.value.filter((goal) =>
    goal.title.toLowerCase().startsWith(token.query),
  )
  const contains = openGoals.value.filter(
    (goal) =>
      !starts.includes(goal) && goal.title.toLowerCase().includes(token.query),
  )
  return [...starts, ...contains].slice(0, 6)
})

const showSuggestions = computed(
  () => projectToken.value !== null && dismissedFor.value !== text.value,
)

function syncCaret() {
  caret.value = inputRef.value?.selectionStart ?? text.value.length
}

function onInput() {
  syncCaret()
  highlighted.value = 0
  dismissedFor.value = null
}

function pickSuggestion(goal: Goal) {
  const token = projectToken.value
  if (!token) return
  const after = text.value.slice(caret.value).replace(/^\S*/, '')
  const inserted = `#${goal.title} `
  text.value = text.value.slice(0, token.start) + inserted + after.trimStart()
  const position = token.start + inserted.length
  void nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.setSelectionRange(position, position)
    syncCaret()
  })
}

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

  const list = suggestions.value
  if (showSuggestions.value && list.length > 0) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      highlighted.value = (highlighted.value + step + list.length) % list.length
      return
    }
    if (event.key === 'Tab' || (event.key === 'Enter' && !event.shiftKey)) {
      event.preventDefault()
      pickSuggestion(list[highlighted.value] ?? list[0])
      return
    }
  }

  if (showSuggestions.value && event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    dismissedFor.value = text.value
    return
  }

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

/** Escape first dismisses the suggestion list; the next one closes the dialog. */
useFocusTrap({
  onEscape: () => {
    if (showSuggestions.value) return false
    closeOverlay()
  },
})
</script>

<template>
  <Teleport to="body">
    <section
      ref="trapRef"
      class="quick-add-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="t('hotkeys.quickAddDialog')"
    >
      <div class="modal-overlay" @click="closeOverlay"></div>
      <div class="quick-add-card">
        <input
          ref="inputRef"
          v-model="text"
          class="quick-add-card__input"
          type="text"
          :placeholder="t('hotkeys.quickAddPlaceholder')"
          autocomplete="off"
          :aria-label="t('hotkeys.taskTitle')"
          aria-autocomplete="list"
          role="combobox"
          :aria-expanded="showSuggestions && suggestions.length > 0"
          aria-controls="quick-add-projects"
          :aria-activedescendant="
            showSuggestions && suggestions.length > 0
              ? `quick-add-option-${highlighted}`
              : undefined
          "
          @keydown="onKeydown"
          @input="onInput"
          @click="syncCaret"
          @keyup="syncCaret"
        />

        <ul
          v-if="showSuggestions"
          id="quick-add-projects"
          class="quick-add-suggest"
          role="listbox"
          :aria-label="t('hotkeys.projectsList')"
        >
          <li
            v-for="(goal, index) in suggestions"
            :id="`quick-add-option-${index}`"
            :key="goal.id"
            class="quick-add-suggest__item"
            :class="{ 'is-active': index === highlighted }"
            role="option"
            :aria-selected="index === highlighted"
            @mousedown.prevent="pickSuggestion(goal)"
            @mouseenter="highlighted = index"
          >
            <span
              class="quick-add-suggest__dot"
              :style="{ background: projectColor(goal.id) }"
              aria-hidden="true"
            ></span>
            {{ goal.title }}
          </li>
          <li
            v-if="suggestions.length === 0 && projectToken?.query"
            class="quick-add-suggest__new"
          >
            {{
              t('hotkeys.noProjectYet', {
                name: projectToken.query.replace(/_/g, ' '),
              })
            }}
          </li>
          <li
            v-else-if="suggestions.length === 0"
            class="quick-add-suggest__new"
          >
            {{ t('hotkeys.typeProjectName') }}
          </li>
        </ul>

        <div class="quick-add-chips" aria-live="polite">
          <span
            v-if="parsed.goalTitle"
            class="quick-add-chip is-project"
            :style="{ '--chip-color': projectColor(parsed.goalId) }"
          >
            {{ parsed.goalTitle }}
          </span>
          <span v-else-if="parsed.newGoalTitle" class="quick-add-chip is-new">
            {{ t('hotkeys.newProjectChip', { name: parsed.newGoalTitle }) }}
          </span>
          <span v-else class="quick-add-chip is-muted">
            {{ currentTitle }}
          </span>
          <span v-if="parsed.date" class="quick-add-chip">{{ dayLabel }}</span>
        </div>

        <p v-if="!text" class="quick-add-card__hint quick-add-card__syntax">
          <span class="quick-add-card__syntax-short">{{
            t('hotkeys.trySyntax')
          }}</span>
          <I18nT
            keypath="hotkeys.trySyntaxFull"
            tag="span"
            class="quick-add-card__syntax-full"
          >
            <template #enter><kbd>Enter</kbd></template>
          </I18nT>
          <span class="quick-add-card__note quick-add-card__syntax-full">
            {{ t('hotkeys.projectHint') }}
          </span>
        </p>
        <p v-else class="quick-add-card__hint">
          <I18nT keypath="hotkeys.keysHint" tag="span">
            <template #enter><kbd>Enter</kbd></template>
            <template #shiftEnter><kbd>Shift</kbd>+<kbd>Enter</kbd></template>
            <template #esc><kbd>Esc</kbd></template>
          </I18nT>
        </p>

        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="closeOverlay">
            {{ t('common.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            type="button"
            :disabled="!parsed.title"
            @click="submit(false)"
          >
            {{ t('hotkeys.addTask') }}
          </button>
        </div>
      </div>
    </section>
  </Teleport>
</template>
