<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TimeEntry } from '../../../entities/TimerEntity'
import type { MajorTaskOption } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { TIMER_MODE, TIMER_STATUS } from '../../../entities/constants'
import { formatHoursMinutes } from '../../../composables/timer/format'
import { durationWords } from '../../../composables/timer/text'
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

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'save-as-task', title: string): void
  (e: 'attach-task', templateId: ID): void
}>()

const { groups: taskGroups } = useTaskPicker(() => props.taskOptions)

const OPTION_MAX_CHARS = 48

/**
 * A native list is as wide as its longest line, so one very long project or
 * task name would stretch it far past the field. Names are data, so the list
 * shows a shortened one; the full text stays in the option's tooltip.
 */
function shortLabel(text: string): string {
  return text.length > OPTION_MAX_CHARS
    ? `${text.slice(0, OPTION_MAX_CHARS - 1)}…`
    : text
}

const {
  timer,
  dialLabel,
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

/** Any whole number of minutes the settings accept; anything else is ignored. */
function setCustomLength(event: Event) {
  const minutes = Math.round(Number((event.target as HTMLInputElement).value))
  if (minutes >= 1 && minutes <= 240) countdownMinutes.value = minutes
}

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
      <h2 class="timer-view__title">{{ t('timer.title') }}</h2>
      <button
        class="ui-icon-btn"
        type="button"
        :title="t('timer.aboutTimer')"
        :aria-label="t('timer.aboutTimer')"
        :aria-expanded="showInfo"
        @click="showInfo = !showInfo"
      >
        <AppIcon name="info" :size="16" />
      </button>
    </header>
    <p v-if="showInfo" class="timer-view__info">
      {{ t('timer.timerInfo') }}
    </p>

    <section class="ui-card timer-view__stage">
      <TimerModePicker
        :mode="mode"
        data-tip-anchor="timer-mode"
        @select="selectMode"
      />

      <TimerDisplay
        :value="dialLabel"
        :caption="statusLabel"
        :progress="progress"
        :status="timer.status"
        variant="large"
      />

      <!-- Countdown length, picked right under the dial before starting. -->
      <div
        v-if="mode === TIMER_MODE.COUNTDOWN && isIdle"
        class="ui-chips timer-view__lengths"
        data-tip-anchor="timer-lengths"
        role="group"
        :aria-label="t('timer.countdownLengthLabel')"
      >
        <button
          v-for="minutes in COUNTDOWN_PRESETS"
          :key="minutes"
          class="ui-chip"
          :class="{ 'is-active': countdownMinutes === minutes }"
          type="button"
          :aria-pressed="countdownMinutes === minutes"
          @click="countdownMinutes = minutes"
        >
          {{ t('timer.lengthMinutes', { n: minutes }) }}
        </button>
        <label class="ui-chip timer-view__custom">
          <input
            type="number"
            min="1"
            max="240"
            inputmode="numeric"
            :aria-label="t('timer.customLengthLabel')"
            :value="
              COUNTDOWN_PRESETS.includes(countdownMinutes)
                ? ''
                : countdownMinutes
            "
            placeholder="…"
            @change="setCustomLength"
          />
          {{ t('timer.unitMinuteShort') }}
        </label>
      </div>

      <!-- Where this sitting's time is booked: an existing task, or a new one. -->
      <div class="timer-view__assign">
        <div class="timer-view__pick">
          <select
            class="timer-view__picker"
            :value="timer.task?.taskId ?? ''"
            :aria-label="t('timer.addTimeToTask')"
            @change="pickTask"
          >
            <option value="">{{ t('timer.noTask') }}</option>
            <optgroup
              v-for="group in taskGroups"
              :key="group.label"
              :label="shortLabel(group.label)"
            >
              <option
                v-for="option in group.tasks"
                :key="option.id"
                :value="option.id"
                :title="option.title"
              >
                {{ shortLabel(option.title) }}
              </option>
            </optgroup>
          </select>
          <button
            v-if="timer.task"
            class="ui-icon-btn"
            type="button"
            :title="t('timer.detachTask')"
            :aria-label="t('timer.detachTask')"
            @click="clearTask"
          >
            <AppIcon name="close" :size="14" />
          </button>
        </div>

        <DisclosureSection
          v-if="canNameSession"
          :label="t('timer.saveAsTaskOr')"
          class="timer-view__save"
        >
          <form class="timer-view__save-form" @submit.prevent="saveAsTask">
            <input
              v-model="newTaskTitle"
              type="text"
              :placeholder="t('timer.taskPlaceholder')"
              :aria-label="t('timer.nameSessionLabel')"
            />
            <button
              class="btn btn-ghost"
              type="submit"
              :disabled="!newTaskTitle.trim()"
            >
              {{ t('timer.saveAsNewTask') }}
            </button>
          </form>
        </DisclosureSection>
      </div>

      <p v-if="hint" class="timer-view__hint ui-oneline">{{ hint }}</p>

      <TimerControls
        data-tip-anchor="timer-controls"
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
        {{
          t('timer.todayTotal', {
            time: formatHoursMinutes(todayTotalMs, durationWords()),
          })
        }}
      </p>
    </section>

    <header class="timer-view__history-head">
      <p class="ui-section-label">{{ t('timer.history') }}</p>
      <button
        class="ui-chip timer-view__add"
        type="button"
        @click="openEditor(null)"
      >
        <AppIcon name="plus" :size="14" />
        {{ t('timer.addEntry') }}
      </button>
    </header>

    <TimeEntryList data-tip-anchor="timer-history" @edit="openEditor" />

    <TimeEntryEditor
      v-if="isEditorOpen"
      :entry="editorEntry"
      @saved="closeEditor"
      @close="closeEditor"
    />
  </section>
</template>
