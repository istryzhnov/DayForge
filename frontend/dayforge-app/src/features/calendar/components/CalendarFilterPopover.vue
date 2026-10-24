<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import { NO_PROJECT_FILTER_ID } from '../../../composables/useSettings'
import ProjectIcon from '../../goals/components/ProjectIcon.vue'
import type { CalendarViewMode } from '../composables/useCalendarDayView'
import { useCalendarFilter } from '../composables/useCalendarFilter'

const props = defineProps<{
  goals: Goal[]
  /** Per-project colours, keyed by goal id. */
  goalVarsById: Record<ID, Record<string, string>>
}>()

const viewMode = defineModel<CalendarViewMode>({ required: true })

const VIEW_MODES: { id: CalendarViewMode; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

const { isGoalVisible, toggleGoal, showAll, hideAll, isFilterActive } =
  useCalendarFilter()

const isOpen = ref(false)
const rootRef = useTemplateRef<HTMLElement>('rootRef')
const triggerRef = useTemplateRef<HTMLButtonElement>('triggerRef')

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

function handlePointerDown(event: PointerEvent) {
  if (!isOpen.value) return
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) close()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close(true)
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handlePointerDown)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div ref="rootRef" class="calendar-filter">
    <button
      ref="triggerRef"
      class="theme-chip calendar-filter__trigger"
      :class="{ active: isOpen }"
      type="button"
      aria-label="Calendar filter"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
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
      class="calendar-filter__panel"
      role="dialog"
      aria-label="Calendar view"
    >
      <p class="calendar-filter__title">Calendar view</p>

      <div class="calendar-filter__segments" role="group" aria-label="View">
        <button
          v-for="mode in VIEW_MODES"
          :key="mode.id"
          class="theme-chip"
          :class="{ active: viewMode === mode.id }"
          type="button"
          :aria-pressed="viewMode === mode.id"
          @click="viewMode = mode.id"
        >
          {{ mode.label }}
        </button>
      </div>

      <div class="calendar-filter__section">
        <div class="calendar-filter__section-head">
          <p class="calendar-filter__caption">Projects</p>
          <div class="calendar-filter__bulk">
            <button
              v-if="isFilterActive"
              class="btn btn-ghost calendar-filter__show-all"
              type="button"
              @click="showAll"
            >
              Show all
            </button>
            <button
              v-if="!isEverythingHidden"
              class="btn btn-ghost calendar-filter__show-all"
              type="button"
              @click="hideAll(liveGoals.map((goal) => goal.id))"
            >
              Hide all
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
              <span class="calendar-filter__name">No project</span>
            </label>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
