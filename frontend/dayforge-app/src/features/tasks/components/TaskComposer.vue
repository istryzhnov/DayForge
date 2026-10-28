<script setup lang="ts">
import { onMounted, ref, useId, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../components/AppIcon.vue'
import type { Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import { useTaskComposerState } from '../composables/useTaskComposerState'
import TaskScheduleFields from './TaskScheduleFields.vue'

const props = defineProps<{
  isSubtask?: boolean
  /** Shows the N shortcut in the row; set where N quick-add is the way in. */
  shortcut?: boolean
}>()

const emit = defineEmits<{
  (
    e: 'submit',
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
const inputId = useId()
// The calendar button is the only switch for scheduling in this row.
const calendarOn = ref(false)

const scheduleFields =
  useTemplateRef<InstanceType<typeof TaskScheduleFields>>('scheduleFields')

const { title, submit, cancel } = useTaskComposerState(
  {
    isSubtask: Boolean(props.isSubtask),
    readSchedule: () => scheduleFields.value?.buildSchedule(),
    canSubmitSchedule: () => scheduleFields.value?.isValid ?? true,
    onScheduleSubmitted: () => scheduleFields.value?.reset(),
  },
  {
    onSubmit: (nextTitle, nextPriority, nextSchedule) =>
      emit('submit', nextTitle, nextPriority, nextSchedule),
    onCancel: () => emit('cancel'),
  },
)

const input = useTemplateRef<HTMLInputElement>('input')

// A subtask row opens because + was pressed, so typing should land in it
// rather than in the page, where letters are shortcuts.
onMounted(() => {
  if (props.isSubtask) input.value?.focus()
})
</script>

<template>
  <div class="task-composer">
    <div class="ui-card task-composer__row">
      <AppIcon name="plus" :size="16" class="task-composer__plus" />

      <label :for="inputId" class="task-composer__label">{{
        t('tasks.addTask')
      }}</label>
      <input
        :id="inputId"
        ref="input"
        v-model="title"
        class="task-composer__input"
        type="text"
        :placeholder="t('tasks.addTask')"
        :data-tip-anchor="isSubtask ? undefined : 'composer-input'"
        @keydown.enter="submit"
      />

      <!-- Optional extra choice in the row, e.g. the project in All Tasks. -->
      <slot name="target" />

      <button
        type="button"
        class="ui-icon-btn ui-icon-btn--outlined task-composer__calendar"
        :class="{ 'is-active': calendarOn }"
        :aria-pressed="calendarOn"
        :aria-label="t('tasks.scheduleOnCalendar')"
        :title="t('tasks.scheduleOnCalendar')"
        :data-tip-anchor="isSubtask ? undefined : 'composer-calendar'"
        @click="calendarOn = !calendarOn"
      >
        <AppIcon name="calendar" :size="16" />
      </button>

      <button
        v-if="isSubtask"
        type="button"
        class="task-composer__cancel"
        @click="cancel"
      >
        {{ t('common.cancel') }}
      </button>
      <kbd
        v-if="shortcut"
        class="kbd-badge task-composer__key"
        :title="t('tasks.quickAddFromAnywhere')"
        aria-hidden="true"
        >N</kbd
      >
      <button type="button" class="task-composer__add" @click="submit">
        {{ t('common.add') }}
      </button>
    </div>

    <TaskScheduleFields
      ref="scheduleFields"
      v-model:enabled="calendarOn"
      hide-toggle
    />
  </div>
</template>
