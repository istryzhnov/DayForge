<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useContextMenu } from '../../../shared/composables/useContextMenu'
import { GOAL_STATUS } from '../../../entities/constants'
import type { GoalStatus } from '../../../entities/types'

const { t } = useI18n()

const props = defineProps<{
  x: number
  y: number
  goalTitle: string
  status: GoalStatus
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  (e: 'open-settings'): void
  (e: 'set-status', status: GoalStatus): void
  (e: 'move', step: -1 | 1): void
  (e: 'delete'): void
  (e: 'close'): void
}>()

const { menuPositionStyle } = useContextMenu({
  getPosition: () => ({ x: props.x, y: props.y }),
  onClose: () => emit('close'),
})

const isPaused = computed(() => props.status === GOAL_STATUS.PAUSED)
const isArchived = computed(() => props.status === GOAL_STATUS.ARCHIVED)

/** A paused project resumes; an active one pauses. Archived ones show no pause item. */
const pauseItem = computed(() =>
  isPaused.value
    ? { label: 'sidebar.resumeProject', next: GOAL_STATUS.ACTIVE }
    : { label: 'sidebar.pauseProject', next: GOAL_STATUS.PAUSED },
)
</script>

<template>
  <div
    ref="menuRef"
    class="goal-context-menu"
    role="menu"
    :aria-label="t('common.actions')"
    :style="menuPositionStyle"
  >
    <p class="goal-context-menu__title" role="presentation">{{ goalTitle }}</p>
    <div class="goal-settings__divider" role="separator"></div>
    <button
      role="menuitem"
      class="goal-settings__item"
      type="button"
      @click="emit('open-settings')"
    >
      {{ t('sidebar.projectSettings') }}
    </button>
    <div class="goal-settings__divider"></div>
    <button
      v-if="!isArchived"
      role="menuitem"
      class="goal-settings__item"
      type="button"
      @click="emit('set-status', pauseItem.next)"
    >
      {{ t(pauseItem.label) }}
    </button>
    <button
      role="menuitem"
      class="goal-settings__item"
      type="button"
      @click="
        emit(
          'set-status',
          isArchived ? GOAL_STATUS.ACTIVE : GOAL_STATUS.ARCHIVED,
        )
      "
    >
      {{
        t(isArchived ? 'sidebar.unarchiveProject' : 'sidebar.archiveProject')
      }}
    </button>
    <div v-if="canMoveUp || canMoveDown" class="goal-settings__divider"></div>
    <button
      v-if="canMoveUp"
      role="menuitem"
      class="goal-settings__item"
      type="button"
      @click="emit('move', -1)"
    >
      {{ t('sidebar.moveUp') }}
    </button>
    <button
      v-if="canMoveDown"
      role="menuitem"
      class="goal-settings__item"
      type="button"
      @click="emit('move', 1)"
    >
      {{ t('sidebar.moveDown') }}
    </button>
    <div class="goal-settings__divider"></div>
    <button
      role="menuitem"
      class="goal-settings__item goal-settings__item--danger"
      type="button"
      @click="emit('delete')"
    >
      {{ t('sidebar.deleteProject') }}
    </button>
  </div>
</template>
