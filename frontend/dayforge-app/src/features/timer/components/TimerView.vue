<script setup lang="ts">
import { ref } from 'vue'
import type { TimeEntry } from '../../../entities/TimerEntity'
import type { MajorTaskOption } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { TIMER_MODE } from '../../../entities/constants'
import TimerDisplay from './TimerDisplay.vue'
import TimerControls from './TimerControls.vue'
import TimerModePicker from './TimerModePicker.vue'
import TimeEntryList from './TimeEntryList.vue'
import TimeTotals from './TimeTotals.vue'
import TimeEntryEditor from './TimeEntryEditor.vue'
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
  taskLabel,
  todayLabel,
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

/** Empty means "leave it unattached", anything else books the time there. */
function pickTask(event: Event) {
  const templateId = (event.target as HTMLSelectElement).value
  if (!templateId) {
    clearTask()
    return
  }
  emit('attach-task', templateId)
}

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
      <div>
        <h2 class="timer-view__title">Timer</h2>
        <p class="timer-view__subtitle">
          One timer at a time. Starting another stops this one and keeps its
          time.
        </p>
      </div>
      <span class="timer-view__today">Today: {{ todayLabel }}</span>
    </header>

    <div class="timer-view__stage">
      <TimerDisplay
        :value="displayLabel"
        :caption="statusLabel"
        :progress="progress"
        :status="timer.status"
        variant="large"
      />

      <p class="timer-view__task">
        {{ taskLabel }}
        <button
          v-if="timer.task"
          class="timer-view__unlink"
          type="button"
          title="Detach the task"
          @click="clearTask"
        >
          ✕
        </button>
      </p>

      <!-- Where this sitting's time is booked: an existing task, or a new one. -->
      <div class="timer-view__assign">
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

        <form
          v-if="canNameSession"
          class="timer-view__save"
          @submit.prevent="saveAsTask"
        >
          <span class="timer-view__or">or</span>
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
      </div>

      <p v-if="hint" class="timer-view__hint">{{ hint }}</p>

      <TimerControls
        :primary-label="primaryLabel"
        :can-stop="canStop"
        :can-skip="canSkip"
        size="large"
        @primary="primary"
        @stop="stop"
        @skip="skipPhase"
      />
    </div>

    <p class="sidebar-caption">Mode</p>
    <TimerModePicker :mode="mode" @select="selectMode" />

    <template v-if="mode === TIMER_MODE.COUNTDOWN && isIdle">
      <p class="settings-group-hint">Counts down from</p>
      <div class="settings-chips">
        <button
          v-for="minutes in COUNTDOWN_PRESETS"
          :key="minutes"
          class="theme-chip"
          :class="{ active: countdownMinutes === minutes }"
          type="button"
          @click="countdownMinutes = minutes"
        >
          {{ minutes }} min
        </button>
      </div>
    </template>

    <p class="sidebar-caption">Where the time went</p>
    <TimeTotals />

    <header class="timer-view__history-head">
      <p class="sidebar-caption">History</p>
      <button class="btn btn-ghost" type="button" @click="openEditor(null)">
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
