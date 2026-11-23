<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { ID, ISODate, Priority } from '../../../entities/types'
import {
  GOAL_STATUS,
  PRIORITY,
  RECURRENCE_TYPE,
} from '../../../entities/constants'
import {
  addDaysToISODate,
  getTodayISODate,
} from '../../../shared/composables/goalSpace/date'
import {
  capitalizeFirst,
  panelDateLabel,
} from '../../../shared/composables/panelDateLabel'
import { useSettings } from '../../../shared/composables/useSettings'
import {
  parseQuickAdd,
  type QuickAddDay,
  type QuickAddResult,
} from '../composables/quickAdd/parse'
import { parseQuickDate } from '../composables/parseQuickDate'
import { projectColors } from '../../../shared/composables/theme/goalTheme'
import { useHotkeyOverlay } from '../../../shared/composables/useHotkeys'
import { useFocusTrap } from '../../../shared/composables/useFocusTrap'
import { TaskScheduleFields } from '../../tasks'

const props = defineProps<{
  goals: Goal[]
  currentTitle: string
}>()

const emit = defineEmits<{
  (e: 'submit', result: QuickAddResult): void
}>()

const { t } = useI18n()
const { closeOverlay } = useHotkeyOverlay()
const { settings } = useSettings()

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const scheduleFields =
  useTemplateRef<InstanceType<typeof TaskScheduleFields>>('scheduleFields')
const text = ref('')
const today = getTodayISODate()

const openGoals = computed(() =>
  props.goals.filter((goal) => goal.status !== GOAL_STATUS.ARCHIVED),
)

const colors = computed(() => projectColors(openGoals.value))

// --- natural date and time: "завтра 9:00" is read out of the line ----------

/** Day and time words, found first; what is left goes to the project parser. */
const natural = computed(() => parseQuickDate(text.value, today))

const parsed = computed(() =>
  parseQuickAdd(natural.value.title, {
    goals: openGoals.value,
    today,
  }),
)

/** The date and time words in the line, highlighted in the field. */
const segments = computed(() => {
  const value = text.value
  const result: Array<{ text: string; hit: boolean }> = []
  let cursor = 0
  for (const range of natural.value.ranges) {
    result.push({ text: value.slice(cursor, range.start), hit: false })
    result.push({ text: value.slice(range.start, range.end), hit: true })
    cursor = range.end
  }
  result.push({ text: value.slice(cursor), hit: false })
  return result
})

const recognized = computed(() => {
  const date = natural.value.date
  if (!date) return ''
  const day = panelDateLabel(date, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
  const time = natural.value.startTime
  return t('hotkeys.sheetRecognized', {
    value: time ? t('hotkeys.sheetAtTime', { date: day, time }) : day,
  })
})

// --- the existing date, time and repeat picker -----------------------------

/** The picker is shown only while a date or repeat is wanted. */
const scheduleOn = ref(false)
/** Bumped on every change inside the picker, so the tiles re-read it. */
const revision = ref(0)

function bumpRevision() {
  revision.value += 1
}

const schedule = computed<TaskSchedule | undefined>(() => {
  void revision.value
  if (!scheduleOn.value) return undefined
  return scheduleFields.value?.buildSchedule()
})

/** A date typed in the line fills the picker; removing it clears the picker. */
watch(
  () => [natural.value.date, natural.value.startTime] as const,
  ([date, startTime], [previousDate]) => {
    if (date) {
      scheduleFields.value?.load(
        {
          startTime: startTime ?? undefined,
          recurrence: { type: RECURRENCE_TYPE.NONE, startDate: date },
        },
        { enable: true },
      )
    } else if (previousDate) {
      scheduleFields.value?.reset()
    }
    bumpRevision()
  },
)

function dayName(date: ISODate): string {
  if (date === today) return t('hotkeys.today')
  if (date === addDaysToISODate(today, 1)) return t('hotkeys.tomorrow')
  return capitalizeFirst(
    panelDateLabel(date, { weekday: 'short', day: 'numeric', month: 'short' }),
  )
}

const dateValue = computed(() => {
  const value = schedule.value
  if (!value) return t('hotkeys.sheetNoDate')
  const day = dayName(value.date)
  return value.startTime
    ? t('hotkeys.sheetAtTime', { date: day, time: value.startTime })
    : day
})

const REPEAT_LABEL_KEYS: Record<string, string> = {
  [RECURRENCE_TYPE.NONE]: 'tasks.repeatOnce',
  [RECURRENCE_TYPE.DAILY]: 'tasks.repeatDaily',
  [RECURRENCE_TYPE.CUSTOM]: 'tasks.repeatCustom',
  [RECURRENCE_TYPE.WEEKLY]: 'tasks.repeatWeekly',
  [RECURRENCE_TYPE.YEARLY]: 'tasks.repeatYearly',
}

const repeatValue = computed(() => {
  const rule = schedule.value?.recurrence
  if (!rule) return t('tasks.repeatOnce')
  if (rule.type === RECURRENCE_TYPE.DAILY && (rule.interval ?? 1) > 1) {
    return t('tasks.repeatCustom')
  }
  return t(REPEAT_LABEL_KEYS[rule.type] ?? 'tasks.repeatOnce')
})

/** Whether the picker repeats the task, for the Повтор tile. */
const repeats = computed(() => {
  const type = schedule.value?.recurrence.type
  return type !== undefined && type !== RECURRENCE_TYPE.NONE
})

function toggleSchedule() {
  scheduleOn.value = !scheduleOn.value
}

// --- priority and project ---------------------------------------------------

const priority = ref<Priority>(settings.behavior.defaultPriority)
const isMajor = computed(() => priority.value === PRIORITY.MAJOR)

function togglePriority() {
  priority.value = isMajor.value ? PRIORITY.MINOR : PRIORITY.MAJOR
}

/**
 * The chip the user picked: a project id, 'none' for "Без проєкту", or null to
 * keep the project on screen (the default, shown as the checked chip).
 */
const chosenProject = ref<ID | 'none' | null>(null)

const projectChips = computed(() => {
  const chips: Array<{ id: ID | 'none'; title: string; color?: string }> =
    openGoals.value.map((goal) => ({
      id: goal.id,
      title: goal.title,
      color: colors.value.get(goal.id),
    }))
  chips.push({ id: 'none', title: t('tasks.noGoal') })
  return chips
})

/** The chip shown as checked: the typed #project, else the pick, else the open project. */
const checkedChip = computed<ID | 'none' | 'new' | null>(() => {
  if (parsed.value.goalId) return parsed.value.goalId
  if (parsed.value.newGoalTitle) return 'new'
  if (chosenProject.value !== null) return chosenProject.value
  const current = openGoals.value.find(
    (goal) => goal.title === props.currentTitle,
  )
  return current?.id ?? null
})

function pickProject(id: ID | 'none') {
  chosenProject.value = id
}

// --- the #project suggestion list (unchanged behaviour) ---------------------

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

// --- submit ------------------------------------------------------------------

/**
 * Emits the task. A typed #project wins over the chips; the picker supplies
 * the date, time and repeat. The page creates it through its usual path.
 */
function submit(keepOpen: boolean, startTimer = false) {
  const title = parsed.value.title
  if (!title) return

  const picker = scheduleFields.value
  if (scheduleOn.value && picker && !picker.isValid) return
  const built = scheduleOn.value ? picker?.buildSchedule() : undefined

  const typedProject = Boolean(parsed.value.goalId || parsed.value.newGoalTitle)
  const noProject = !typedProject && chosenProject.value === 'none'
  const pickedGoal =
    typedProject || chosenProject.value === 'none' ? null : chosenProject.value
  const weekday = natural.value.day
  const day: QuickAddDay | null = !built
    ? null
    : weekday === 'today' || weekday === 'tomorrow'
      ? weekday
      : 'date'

  emit('submit', {
    ...parsed.value,
    goalId: noProject ? null : (parsed.value.goalId ?? pickedGoal),
    goalTitle: noProject ? null : parsed.value.goalTitle,
    day,
    date: built?.date ?? null,
    schedule: built,
    priority: priority.value,
    noProject,
    startTimer,
  })

  if (!keepOpen) {
    closeOverlay()
    return
  }

  text.value = ''
  chosenProject.value = null
  scheduleFields.value?.reset()
  scheduleOn.value = false
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
  // The title field is the first thing to type into, as before the redesign.
  initialFocus: () => inputRef.value,
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
      aria-labelledby="qa-sheet-title"
      :aria-label="t('hotkeys.quickAddDialog')"
    >
      <div class="modal-overlay" @click="closeOverlay"></div>
      <div class="quick-add-card qa-sheet">
        <span class="qa-sheet__grab" aria-hidden="true"></span>

        <header class="qa-sheet__head">
          <h2 id="qa-sheet-title" class="qa-sheet__title">
            {{ t('hotkeys.sheetHeading') }}
          </h2>
          <button
            type="button"
            class="qa-sheet__close"
            :aria-label="t('hotkeys.sheetClose')"
            :title="t('hotkeys.sheetClose')"
            @click="closeOverlay"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div class="qa-block">
          <label class="qa-label" for="quick-add-input">
            {{ t('hotkeys.sheetWhat') }}
          </label>
          <div class="qa-field">
            <div class="qa-field__mirror" aria-hidden="true">
              <template v-for="(segment, index) in segments" :key="index"
                ><span v-if="segment.hit" class="qa-field__hit">{{
                  segment.text
                }}</span
                ><template v-else>{{ segment.text }}</template></template
              >
            </div>
            <input
              id="quick-add-input"
              ref="inputRef"
              v-model="text"
              class="qa-field__input"
              type="text"
              :placeholder="t('hotkeys.quickAddPlaceholder')"
              autocomplete="off"
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
          </div>
          <p v-if="recognized" class="qa-recognised">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M12 3l1.8 4.9L19 9.7l-4.2 3.1 1.5 5.2L12 15l-4.3 3 1.5-5.2L5 9.7l5.2-1.8z"
              />
            </svg>
            {{ recognized }}
          </p>

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
        </div>

        <div class="qa-block">
          <span id="qa-project-label" class="qa-label">
            {{ t('hotkeys.sheetProject') }}
          </span>
          <div
            class="qa-chips"
            role="radiogroup"
            aria-labelledby="qa-project-label"
          >
            <button
              v-for="chip in projectChips"
              :key="chip.id"
              type="button"
              role="radio"
              class="qa-chip"
              :class="{ 'is-checked': checkedChip === chip.id }"
              :style="{ '--qa-chip': projectColor(chip.id) ?? 'var(--muted)' }"
              :aria-checked="checkedChip === chip.id"
              @click="pickProject(chip.id)"
            >
              <span class="qa-chip__dot" aria-hidden="true"></span>
              {{ chip.title }}
            </button>
            <span
              v-if="parsed.newGoalTitle"
              class="qa-chip is-checked"
              style="--qa-chip: var(--accent)"
              role="radio"
              aria-checked="true"
            >
              <span class="qa-chip__dot" aria-hidden="true"></span>
              {{ parsed.newGoalTitle }}
            </span>
          </div>
        </div>

        <div class="qa-tiles">
          <button
            type="button"
            class="qa-tile"
            :class="{ 'is-on': scheduleOn }"
            :aria-expanded="scheduleOn"
            @click="toggleSchedule"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
              <path d="M3.5 10h17M8 3v4M16 3v4" />
            </svg>
            <span class="qa-tile__text">
              <span class="qa-tile__label">{{ t('hotkeys.sheetDate') }}</span>
              <span class="qa-tile__value">{{ dateValue }}</span>
            </span>
          </button>

          <button
            type="button"
            class="qa-tile"
            :class="{ 'is-major': isMajor }"
            :aria-pressed="isMajor"
            @click="togglePriority"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
            </svg>
            <span class="qa-tile__text">
              <span class="qa-tile__label">{{
                t('hotkeys.sheetPriority')
              }}</span>
              <span class="qa-tile__value">{{
                isMajor ? t('hotkeys.sheetMajor') : t('hotkeys.sheetMinor')
              }}</span>
            </span>
          </button>

          <button
            type="button"
            class="qa-tile"
            :class="{ 'is-on': repeats }"
            :aria-expanded="scheduleOn"
            @click="toggleSchedule"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
              <path d="M18 3v4h-4M6 21v-4h4" />
            </svg>
            <span class="qa-tile__text">
              <span class="qa-tile__label">{{ t('hotkeys.sheetRepeat') }}</span>
              <span class="qa-tile__value">{{ repeatValue }}</span>
            </span>
          </button>
        </div>

        <div class="qa-schedule" @change="bumpRevision" @input="bumpRevision">
          <TaskScheduleFields
            ref="scheduleFields"
            v-model:enabled="scheduleOn"
            hide-toggle
          />
        </div>

        <div class="qa-actions">
          <button
            class="qa-action qa-action--primary"
            type="button"
            :disabled="!parsed.title"
            @click="submit(false)"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.6"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {{ t('hotkeys.sheetAdd') }}
          </button>
          <button
            class="qa-action qa-action--ghost"
            type="button"
            :disabled="!parsed.title"
            @click="submit(false, true)"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 5.5v13l10.5-6.5z" />
            </svg>
            {{ t('hotkeys.sheetAddTimer') }}
          </button>
        </div>
      </div>
    </section>
  </Teleport>
</template>
