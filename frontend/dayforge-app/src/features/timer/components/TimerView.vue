<script setup lang="ts">
import { ref } from 'vue'
import type { TimeEntry } from '../../../entities/TimerEntity'
import type { MajorTaskOption } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { TIMER_MODE, TIMER_STATUS } from '../../../entities/constants'
import { formatHoursMinutes } from '../../../composables/timer/format'
import TimerDisplay from './TimerDisplay.vue'
import TimerControls from './TimerControls.vue'
import TimerModePicker from './TimerModePicker.vue'
import TimeEntryList from './TimeEntryList.vue'
import TimeEntryEditor from './TimeEntryEditor.vue'
import AppIcon from '../../../components/AppIcon.vue'
import DisclosureSection from '../../../components/DisclosureSection.vue'
import { COUNTDOWN_PRESETS, useTimerView } from '../composables/useTimerView'
import { useTaskPicker } from '../composables/useTaskPicker'

const props = defineProps<{ taskOptions: MajorTaskOption[] }>()

const emit = defineEmits<{
  (e: 'save-as-task', title: string): void
  (e: 'attach-task', templateId: ID): void
}>()

const { groups: taskGroups } = useTaskPicker(() => props.taskOptions)

const {
  timer,
  displayLabel,
  progress,
  statusLabel,
  todayTotalMs,
  hint,
  mode,
  selectMode,
  countdownMinutes,
  primaryLabel,
  canStop,
  canSkip,
  isIdle,
  canNameSession,
  primary,
  stop,
  skipPhase,
  clearTask,
} = useTimerView()

const newTaskTitle = ref('')

function saveAsTask() {
  const title = newTaskTitle.value.trim()
  if (!title) return
  emit('save-as-task', title)
  newTaskTitle.value = ''
}

function pickTask(event: Event) {
  const templateId = (event.target as HTMLSelectElement).value
  if (!templateId) {
    clearTask()
    return
  }
  emit('attach-task', templateId)
}

/** The one-line explanation sits behind the info button, not in the header. */
const showInfo = ref(false)

const isEditorOpen = ref(false)
const editorEntry = ref<TimeEntry | null>(null)

function openEditor(entry: TimeEntry | null) {
  editorEntry.value = entry
  isEditorOpen.value = true
}

function closeEditor() {
  isEditorOpen.value = false
  editorEntry.value = null
}
</script>

<template>
  <section class="timer-view">
    <header class="timer-view__head">
      <h2 class="timer-view__title">Timer</h2>
      <button
        class="ui-icon-btn"
        type="button"
        title="About the timer"
        aria-label="About the timer"
        :aria-expanded="showInfo"
        @click="showInfo = !showInfo"
      >
        <AppIcon name="info" :size="16" />
      </button>
    </header>
    <p v-if="showInfo" class="timer-view__info ui-oneline">
      One timer at a time. Starting another stops this one and keeps its time.
    </p>

    <section class="ui-card timer-view__stage">
      <TimerModePicker :mode="mode" @select="selectMode" />

      <TimerDisplay
        :value="displayLabel"
        :caption="statusLabel"
        :progress="progress"
        :status="timer.status"
        variant="large"
      />

      <!-- Where this sitting's time is booked: an existing task, or a new one. -->
      <div class="timer-view__assign">
        <div class="timer-view__pick">
          <select
            class="timer-view__picker"
            :value="timer.task?.taskId ?? ''"
            aria-label="Add this time to a task"
            @change="pickTask"
          >
            <option value="">No task</option>
            <optgroup
              v-for="group in taskGroups"
              :key="group.label"
              :label="group.label"
            >
              <option
                v-for="option in group.tasks"
                :key="option.id"
                :value="option.id"
              >
                {{ option.title }}
              </option>
            </optgroup>
          </select>
          <button
            v-if="timer.task"
            class="ui-icon-btn"
            type="button"
            title="Detach task"
            aria-label="Detach task"
            @click="clearTask"
          >
            <AppIcon name="close" :size="14" />
          </button>
        </div>

        <DisclosureSection
          v-if="canNameSession"
          label="Or save as a new task"
          class="timer-view__save"
        >
          <form class="timer-view__save-form" @submit.prevent="saveAsTask">
            <input
              v-model="newTaskTitle"
              type="text"
              placeholder="What are you working on?"
              aria-label="Name this session"
            />
            <button
              class="btn btn-ghost"
              type="submit"
              :disabled="!newTaskTitle.trim()"
            >
              Save as new task
            </button>
          </form>
        </DisclosureSection>
      </div>

      <p v-if="hint" class="timer-view__hint ui-oneline">{{ hint }}</p>

      <TimerControls
        :primary-label="primaryLabel"
        :primary-icon="timer.status === TIMER_STATUS.RUNNING ? 'pause' : 'play'"
        :can-stop="canStop"
        :can-skip="canSkip"
        size="large"
        @primary="primary"
        @stop="stop"
        @skip="skipPhase"
      />

      <p class="timer-view__today">
        Today · {{ formatHoursMinutes(todayTotalMs) }}
      </p>
    </section>

    <template v-if="mode === TIMER_MODE.COUNTDOWN && isIdle">
      <p class="ui-section-label">Counts down from</p>
      <div class="ui-chips">
        <button
          v-for="minutes in COUNTDOWN_PRESETS"
          :key="minutes"
          class="ui-chip"
          :class="{ 'is-active': countdownMinutes === minutes }"
          type="button"
          @click="countdownMinutes = minutes"
        >
          {{ minutes }} min
        </button>
      </div>
    </template>

    <header class="timer-view__history-head">
      <p class="ui-section-label">History</p>
      <button class="ui-chip timer-view__add" type="button" @click="openEditor(null)">
        <AppIcon name="plus" :size="14" />
        Add entry
      </button>
    </header>

    <TimeEntryList @edit="openEditor" />

    <TimeEntryEditor
      v-if="isEditorOpen"
      :entry="editorEntry"
      @saved="closeEditor"
      @close="closeEditor"
    />
  </section>
</template>
