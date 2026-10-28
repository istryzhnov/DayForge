<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useContextMenu } from '../../../composables/useContextMenu'
import DisclosureSection from '../../../components/DisclosureSection.vue'

const props = defineProps<{
  x: number
  y: number
  isDone: boolean
  canSetAsProject: boolean
  canAddChild: boolean
  isProject: boolean
  /** Only a task without a parent can pick a new home. */
  canMove: boolean
  /** Already on the calendar, so the entry offers to change it instead. */
  isScheduled: boolean
  /** Billing at its own rate, so the entry offers to change it instead. */
  hasOwnRate: boolean
  /** Has a note already, so the entry offers to edit it instead. */
  hasNotes: boolean
  /** Running on this task, so the entry offers to stop it instead. */
  isTimerActive: boolean
  /** A finished, scheduled block with no time logged over it yet. */
  canLogPlanned?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'schedule'): void
  (e: 'set-rate'): void
  (e: 'move'): void
  (e: 'nudge', step: -1 | 1): void
  (e: 'delete'): void
  (e: 'add-to-this'): void
  (e: 'toggle-check'): void
  (e: 'add-note'): void
  (e: 'toggle-timer'): void
  (e: 'log-planned'): void
  (e: 'set-as-project'): void
  (e: 'show-habit'): void
  (e: 'close'): void
}>()

const { t } = useI18n()

const { menuPositionStyle } = useContextMenu({
  getPosition: () => ({ x: props.x, y: props.y }),
  onClose: () => emit('close'),
})
</script>

<template>
  <div
    ref="menuRef"
    class="task-context-menu"
    role="menu"
    :aria-label="t('common.actions')"
    :style="menuPositionStyle"
  >
    <button
      role="menuitem"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('edit')
          emit('close')
        }
      "
    >
      {{ t('tasks.edit') }}
    </button>
    <button
      role="menuitem"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('toggle-check')
          emit('close')
        }
      "
    >
      {{ isDone ? t('tasks.markNotDone') : t('tasks.checkIt') }}
    </button>
    <button
      role="menuitem"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('schedule')
          emit('close')
        }
      "
    >
      {{ isScheduled ? t('tasks.changeTime') : t('tasks.addToCalendar') }}
    </button>
    <button
      role="menuitem"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('add-note')
          emit('close')
        }
      "
    >
      {{ hasNotes ? t('tasks.editNote') : t('tasks.addNote') }}
    </button>
    <button
      role="menuitem"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('toggle-timer')
          emit('close')
        }
      "
    >
      {{ isTimerActive ? t('tasks.stopTimer') : t('tasks.startTimer') }}
    </button>
    <button
      v-if="canLogPlanned"
      role="menuitem"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('log-planned')
          emit('close')
        }
      "
    >
      {{ t('tasks.logAsPlanned') }}
    </button>
    <DisclosureSection
      :label="t('tasks.more')"
      class="task-context-menu__more"
      summary-role="menuitem"
    >
      <button
        v-if="canMove"
        role="menuitem"
        class="task-context-menu__item"
        type="button"
        @click="
          () => {
            emit('move')
            emit('close')
          }
        "
      >
        {{ t('tasks.moveTo') }}
      </button>
      <button
        role="menuitem"
        class="task-context-menu__item"
        type="button"
        @click="
          () => {
            emit('nudge', -1)
            emit('close')
          }
        "
      >
        {{ t('sidebar.moveUp') }}
      </button>
      <button
        role="menuitem"
        class="task-context-menu__item"
        type="button"
        @click="
          () => {
            emit('nudge', 1)
            emit('close')
          }
        "
      >
        {{ t('sidebar.moveDown') }}
      </button>
      <button
        v-if="canSetAsProject"
        role="menuitem"
        class="task-context-menu__item"
        type="button"
        @click="
          () => {
            emit('set-as-project')
            emit('close')
          }
        "
      >
        {{ t('tasks.setAsProject') }}
      </button>
      <button
        v-if="canAddChild"
        role="menuitem"
        class="task-context-menu__item"
        type="button"
        @click="
          () => {
            emit('add-to-this')
            emit('close')
          }
        "
      >
        {{ t('tasks.addToThis') }}
      </button>
      <button
        v-if="isProject"
        role="menuitem"
        class="task-context-menu__item"
        type="button"
        @click="
          () => {
            emit('show-habit')
            emit('close')
          }
        "
      >
        {{ t('tasks.showHabit') }}
      </button>
      <button
        role="menuitem"
        class="task-context-menu__item"
        type="button"
        @click="
          () => {
            emit('set-rate')
            emit('close')
          }
        "
      >
        {{ hasOwnRate ? t('tasks.changeRate') : t('tasks.setRate') }}
      </button>
    </DisclosureSection>
    <div class="task-context-menu__divider" role="separator"></div>
    <button
      role="menuitem"
      class="task-context-menu__item task-context-menu__item--danger"
      type="button"
      @click="
        () => {
          emit('delete')
          emit('close')
        }
      "
    >
      {{ t('common.delete') }}
    </button>
  </div>
</template>
