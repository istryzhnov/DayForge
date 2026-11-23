<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TimeEntry } from '../../../entities/TimerEntity'
import type { Goal } from '../../../entities/GoalEntity'
import type {
  MajorTaskOption,
  TaskTemplate,
} from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { TIMER_MODE, TIMER_STATUS } from '../../../entities/constants'
import { formatHoursMinutes } from '../../../shared/composables/timer/format'
import { durationWords } from '../../../shared/composables/timer/text'
import { buildRateLookup } from '../../../shared/composables/timer/rates'
import { projectColors } from '../../../shared/composables/theme/goalTheme'
import { useSettings } from '../../../shared/composables/useSettings'
import { useTimeEntries } from '../../../shared/composables/useTimeEntries'
import TimerDisplay from './TimerDisplay.vue'
import TimerControls from './TimerControls.vue'
import TimerModePicker from './TimerModePicker.vue'
import TimeEntryList from './TimeEntryList.vue'
import TimeEntryEditor from './TimeEntryEditor.vue'
import AppIcon from '../../../shared/ui/AppIcon.vue'
import DisclosureSection from '../../../shared/ui/DisclosureSection.vue'
import { COUNTDOWN_PRESETS, useTimerView } from '../composables/useTimerView'
import { useTaskPicker } from '../composables/useTaskPicker'
import {
  formatEarned,
  formatRate,
  liveStretchMs,
  sessionEarned,
  taskRate,
} from '../composables/timerSubline'
import {
  SETTINGS_SECTION,
  useSettingsPanel,
} from '../../../shared/composables/useSettingsPanel'

const props = withDefaults(
  defineProps<{
    taskOptions: MajorTaskOption[]
    /** Projects, for row colours and the default rate of each project. */
    goals?: Goal[]
    /** Task templates, which carry a task's own rate. */
    templates?: TaskTemplate[]
  }>(),
  { goals: () => [], templates: () => [] },
)

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
  now,
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

const { settings } = useSettings()
const { entries } = useTimeEntries()
const rateLookup = computed(() =>
  buildRateLookup(props.templates, props.goals, settings.timer.hourlyRate),
)

/** Project colours for the history rows, the same ones Analytics uses. */
const rowColors = computed(() => projectColors(props.goals))

/** The attached task's rate, so the subline shows money only when one is set. */
const attachedRate = computed(() =>
  taskRate(rateLookup.value, timer.value.task),
)

/** Money earned in this sitting: saved stretches plus the one running now. */
const sittingEarned = computed(() =>
  sessionEarned({
    entries: entries.value,
    sessionId: timer.value.sessionId,
    liveMs: liveStretchMs(timer.value, now.value),
    task: timer.value.task,
    lookup: rateLookup.value,
  }),
)

const attachedProject = computed(() => {
  const task = timer.value.task
  if (!task) return ''
  const option = props.taskOptions.find((item) => item.id === task.taskId)
  return option?.goalTitle || t('analytics.noProject')
})

const settingsPanel = useSettingsPanel()

/** Pomodoro lengths, the default countdown and the rest live in settings. */
function openTimerSettings() {
  settingsPanel.open(SETTINGS_SECTION.TIMER)
}

/** Before a countdown starts, its dial is a button: tap it to type a length. */
const canEditLength = computed(
  () => mode.value === TIMER_MODE.COUNTDOWN && isIdle.value,
)
const isEditingLength = ref(false)
const draftMinutes = ref(0)
const lengthInput = ref<HTMLInputElement | null>(null)

async function startEditLength() {
  draftMinutes.value = countdownMinutes.value
  isEditingLength.value = true
  await nextTick()
  lengthInput.value?.select()
}

/** Any whole number of minutes the settings accept; anything else is dropped. */
function applyLength() {
  if (!isEditingLength.value) return
  const minutes = Math.round(Number(draftMinutes.value))
  if (minutes >= 1 && minutes <= 240) countdownMinutes.value = minutes
  isEditingLength.value = false
}

function cancelEditLength() {
  isEditingLength.value = false
}

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
      <h1 class="timer-view__title">{{ t('timer.title') }}</h1>
      <span class="timer-view__head-actions">
        <button
          class="ui-icon-btn timer-view__settings"
          type="button"
          :title="t('timer.settingsTitle')"
          :aria-label="t('timer.settingsTitle')"
          @click="openTimerSettings"
        >
          <AppIcon name="settings" :size="16" />
        </button>
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
      </span>
    </header>
    <p v-if="showInfo" class="timer-view__info">
      {{ t('timer.timerInfo') }}
    </p>

    <div class="timer-view__body">
      <section class="ui-card timer-view__stage">
        <TimerModePicker
          :mode="mode"
          data-tip-anchor="timer-mode"
          @select="selectMode"
        />

        <div
          class="timer-view__dial"
          :class="{ 'is-editing': isEditingLength }"
        >
          <component
            :is="canEditLength && !isEditingLength ? 'button' : 'div'"
            class="timer-view__dial-face"
            :class="{ 'is-editable': canEditLength && !isEditingLength }"
            v-bind="
              canEditLength && !isEditingLength
                ? {
                    type: 'button',
                    title: t('timer.editLengthTitle'),
                    'aria-label': t('timer.editLengthTitle'),
                  }
                : {}
            "
            @click="canEditLength && !isEditingLength && startEditLength()"
          >
            <TimerDisplay
              :value="dialLabel"
              :caption="statusLabel"
              :progress="progress"
              :status="timer.status"
              variant="large"
            />
          </component>
          <form
            v-if="isEditingLength"
            class="timer-view__dial-edit"
            @submit.prevent="applyLength"
          >
            <input
              ref="lengthInput"
              v-model.number="draftMinutes"
              type="number"
              min="1"
              max="240"
              inputmode="numeric"
              :aria-label="t('timer.customLengthLabel')"
              @blur="applyLength"
              @keydown.esc.prevent="cancelEditLength"
            />
            <span>{{ t('timer.unitMinuteShort') }}</span>
          </form>
        </div>

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

          <p v-if="timer.task" class="timer-view__subline">
            <span class="timer-view__project">{{ attachedProject }}</span>
            <template v-if="attachedRate > 0">
              <span aria-hidden="true">·</span>
              <span>
                {{
                  t('analytics.ratePerHour', {
                    rate: formatRate(
                      attachedRate,
                      settings.format.locale,
                      settings.timer.currency,
                    ),
                  })
                }}
              </span>
              <span aria-hidden="true">·</span>
              <span class="timer-view__earned">{{
                formatEarned(
                  sittingEarned,
                  settings.format.locale,
                  settings.timer.currency,
                )
              }}</span>
            </template>
          </p>

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
          :primary-icon="
            timer.status === TIMER_STATUS.RUNNING ? 'pause' : 'play'
          "
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

      <div class="timer-view__log">
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

        <TimeEntryList
          data-tip-anchor="timer-history"
          :project-colors="rowColors"
          @edit="openEditor"
        />
      </div>
    </div>

    <TimeEntryEditor
      v-if="isEditorOpen"
      :entry="editorEntry"
      @saved="closeEditor"
      @close="closeEditor"
    />
  </section>
</template>
