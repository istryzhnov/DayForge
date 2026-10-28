<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import { NO_PROJECT_FILTER_ID } from '../../../composables/useSettings'
import ProjectIcon from '../../goals/components/ProjectIcon.vue'
import { useCalendarFilter } from '../composables/useCalendarFilter'
import { useOpenFocusTrap } from '../../../composables/useFocusTrap'

const props = defineProps<{
  goals: Goal[]
  /** Per-project colours, keyed by goal id. */
  goalVarsById: Record<ID, Record<string, string>>
}>()

const { t } = useI18n()
const { isGoalVisible, toggleGoal, showAll, hideAll, isFilterActive } =
  useCalendarFilter()

const isOpen = ref(false)
const rootRef = useTemplateRef<HTMLElement>('rootRef')
const triggerRef = useTemplateRef<HTMLButtonElement>('triggerRef')
const panelRef = useTemplateRef<HTMLElement>('panelRef')
const panelId = `calendar-filter-panel-${Math.random().toString(36).slice(2, 8)}`

const liveGoals = computed(() => props.goals.filter((goal) => !goal.deletedAt))

const isEverythingHidden = computed(
  () =>
    !isGoalVisible(undefined) &&
    liveGoals.value.every((goal) => !isGoalVisible(goal.id)),
)

function accentFor(goal: Goal): string | undefined {
  return (
    props.goalVarsById[goal.id]?.['--accent'] ??
    goal.theme?.accent ??
    goal.accentColor
  )
}

function toggleOpen() {
  isOpen.value = !isOpen.value
}

function close(restoreFocus = false) {
  if (!isOpen.value) return
  isOpen.value = false
  if (restoreFocus) triggerRef.value?.focus()
}

/** Tab stays inside the panel while it is open; Escape closes it and returns focus to the trigger. */
useOpenFocusTrap(
  () => panelRef.value,
  () => isOpen.value,
  {
    modal: false,
    onEscape: () => close(true),
  },
)

function handlePointerDown(event: PointerEvent) {
  if (!isOpen.value) return
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('pointerdown', handlePointerDown))

onUnmounted(() =>
  document.removeEventListener('pointerdown', handlePointerDown),
)
</script>

<template>
  <div ref="rootRef" class="calendar-filter" data-tip-anchor="calendar-filter">
    <button
      ref="triggerRef"
      class="ui-icon-btn ui-icon-btn--outlined calendar-filter__trigger"
      :class="{ 'is-active': isOpen }"
      type="button"
      :aria-label="t('calendar.filterLabel')"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? panelId : undefined"
      @click="toggleOpen"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
        <circle cx="15" cy="6" r="2" />
        <circle cx="9" cy="12" r="2" />
        <circle cx="17" cy="18" r="2" />
      </svg>
      <span v-if="isFilterActive" class="calendar-filter__badge"></span>
    </button>

    <div
      v-if="isOpen"
      :id="panelId"
      ref="panelRef"
      class="calendar-filter__panel"
      role="dialog"
      :aria-label="t('calendar.filterLabel')"
    >
      <div class="calendar-filter__section">
        <div class="calendar-filter__section-head">
          <p class="calendar-filter__caption">{{ t('calendar.projects') }}</p>
          <div class="calendar-filter__bulk">
            <button
              v-if="isFilterActive"
              class="btn btn-ghost calendar-filter__show-all"
              type="button"
              @click="showAll"
            >
              {{ t('calendar.showAll') }}
            </button>
            <button
              v-if="!isEverythingHidden"
              class="btn btn-ghost calendar-filter__show-all"
              type="button"
              @click="hideAll(liveGoals.map((goal) => goal.id))"
            >
              {{ t('calendar.hideAll') }}
            </button>
          </div>
        </div>

        <ul class="calendar-filter__list">
          <li v-for="goal in liveGoals" :key="goal.id">
            <label
              class="calendar-filter__row"
              :style="
                accentFor(goal)
                  ? { '--row-accent': accentFor(goal) }
                  : undefined
              "
            >
              <input
                type="checkbox"
                :checked="isGoalVisible(goal.id)"
                @change="toggleGoal(goal.id)"
              />
              <span class="calendar-filter__dot" aria-hidden="true"></span>
              <ProjectIcon class="calendar-filter__icon" :icon="goal.icon" />
              <span class="calendar-filter__name">{{ goal.title }}</span>
            </label>
          </li>

          <li>
            <label class="calendar-filter__row">
              <input
                type="checkbox"
                :checked="isGoalVisible(undefined)"
                @change="toggleGoal(NO_PROJECT_FILTER_ID)"
              />
              <span class="calendar-filter__dot" aria-hidden="true"></span>
              <span class="calendar-filter__name">{{
                t('calendar.noProject')
              }}</span>
            </label>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
