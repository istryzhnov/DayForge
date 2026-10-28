<script setup lang="ts">
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../components/AppIcon.vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ISODate } from '../../../entities/types'
import { GOAL_STATUS } from '../../../entities/constants'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import { useFormat } from '../../../composables/useFormat'
import {
  useGlobalSearch,
  type SearchResult,
} from '../composables/useGlobalSearch'

const props = defineProps<{
  goals: Goal[]
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
  currentDate: ISODate
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', result: SearchResult): void
}>()

const { formatDate } = useFormat()
const { t } = useI18n()

const search = useGlobalSearch({
  getGoals: () => props.goals,
  getTemplates: () => props.templates,
  getDailyTasks: () => props.dailyTasks,
  getToday: () => props.currentDate,
})

const { query, groups, results, activeIndex, activeResult, hasQuery } = search

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

useFocusTrap({ onEscape: () => emit('close') })

onMounted(() => inputRef.value?.focus())

const flatIndexByKey = computed(
  () => new Map(results.value.map((result, index) => [result.key, index])),
)

function optionId(result: SearchResult): string {
  return `search-option-${flatIndexByKey.value.get(result.key) ?? 0}`
}

const activeDescendant = computed(() =>
  activeResult.value ? optionId(activeResult.value) : undefined,
)

const REPEAT_LABEL_KEY: Record<string, string> = {
  daily: 'search.repeatDaily',
  weekly: 'search.repeatWeekly',
  monthly: 'search.repeatMonthly',
  yearly: 'search.repeatYearly',
  custom: 'search.repeats',
}

function metaOf(result: SearchResult): string {
  const parts: string[] = []

  if (result.kind === 'project') {
    if (result.status === GOAL_STATUS.PAUSED) parts.push(t('search.paused'))
    if (result.status === GOAL_STATUS.ARCHIVED) parts.push(t('search.archived'))
    if (parts.length === 0) parts.push(t('search.project'))
    return parts.join(' · ')
  }

  if (result.projectTitle) parts.push(result.projectTitle)
  if (result.date) {
    parts.push(formatDate(result.date, { day: 'numeric', month: 'short' }))
  }
  if (result.repeat) {
    parts.push(t(REPEAT_LABEL_KEY[result.repeat] ?? 'search.repeats'))
  }
  return parts.join(' · ')
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    search.move(event.key === 'ArrowDown' ? 1 : -1)
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    if (activeResult.value) emit('select', activeResult.value)
  }
}

watch(activeIndex, () => {
  void nextTick(() => {
    document
      .getElementById(`search-option-${activeIndex.value}`)
      ?.scrollIntoView({ block: 'nearest' })
  })
})
</script>

<template>
  <Teleport to="body">
    <section
      ref="trapRef"
      class="quick-add-modal search-palette"
      role="dialog"
      aria-modal="true"
      :aria-label="t('search.placeholder')"
    >
      <div class="modal-overlay" @click="emit('close')"></div>
      <div class="search-palette__card">
        <div class="search-palette__field">
          <svg
            class="search-palette__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref="inputRef"
            v-model="query"
            class="search-palette__input"
            type="text"
            role="combobox"
            :placeholder="t('search.placeholder')"
            autocomplete="off"
            spellcheck="false"
            :aria-label="t('search.placeholder')"
            aria-autocomplete="list"
            aria-controls="search-results"
            :aria-expanded="results.length > 0"
            :aria-activedescendant="activeDescendant"
            @keydown="onKeydown"
          />
          <!-- A phone has no Esc key, and the card fills the screen there. -->
          <button
            class="ui-icon-btn search-palette__close"
            type="button"
            :aria-label="t('common.close')"
            @click="emit('close')"
          >
            <AppIcon name="close" :size="16" />
          </button>
        </div>

        <div
          id="search-results"
          class="search-palette__body"
          role="listbox"
          :aria-label="t('search.results')"
        >
          <template v-if="hasQuery">
            <div
              v-for="group in groups"
              :key="group.key"
              class="search-group"
              role="group"
              :aria-label="group.label"
            >
              <p class="search-group__label" aria-hidden="true">
                {{ group.label }}
              </p>
              <div
                v-for="result in group.results"
                :id="optionId(result)"
                :key="result.key"
                class="search-result"
                :class="{
                  'is-active': flatIndexByKey.get(result.key) === activeIndex,
                  'is-done': result.kind === 'done',
                }"
                role="option"
                :aria-selected="flatIndexByKey.get(result.key) === activeIndex"
                @mousedown.prevent
                @mousemove="
                  search.setActive(flatIndexByKey.get(result.key) ?? 0)
                "
                @click="emit('select', result)"
              >
                <span
                  class="search-result__dot"
                  :class="{ 'is-plain': !result.color }"
                  :style="
                    result.color ? { background: result.color } : undefined
                  "
                  aria-hidden="true"
                ></span>
                <span class="search-result__copy">
                  <span class="search-result__title">
                    <template
                      v-for="(segment, index) in result.titleSegments"
                      :key="index"
                    >
                      <mark v-if="segment.match">{{ segment.text }}</mark>
                      <template v-else>{{ segment.text }}</template>
                    </template>
                  </span>
                  <span v-if="result.snippet" class="search-result__snippet">
                    <template
                      v-for="(segment, index) in result.snippet"
                      :key="index"
                    >
                      <mark v-if="segment.match">{{ segment.text }}</mark>
                      <template v-else>{{ segment.text }}</template>
                    </template>
                  </span>
                  <span class="search-result__meta">{{ metaOf(result) }}</span>
                </span>
              </div>
            </div>

            <p v-if="results.length === 0" class="search-palette__empty">
              {{ t('search.noMatches') }}
            </p>
          </template>

          <p v-else class="search-palette__idle">
            {{ t('search.idle') }}
          </p>
        </div>

        <footer class="search-palette__hint">
          <span><kbd>↑</kbd> <kbd>↓</kbd> {{ t('search.move') }}</span>
          <span><kbd>Enter</kbd> {{ t('search.open') }}</span>
          <span><kbd>Esc</kbd> {{ t('search.close') }}</span>
        </footer>
      </div>
    </section>
  </Teleport>
</template>
