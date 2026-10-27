<script setup lang="ts">
import type { ID } from '../../../entities/types'
import AppIcon from '../../../components/AppIcon.vue'
import { useTaskTimerButton } from '../composables/useTaskTimerButton'

const props = defineProps<{
  taskId: ID
  title: string
  goalId?: ID
  rollupTaskIds?: ID[]
}>()

const { isActive, isShown, totalLabel, runningLabel, hint, toggle } =
  useTaskTimerButton(props)
</script>

<template>
  <button
    v-if="isShown"
    class="task-timer-btn"
    :class="{ 'is-active': isActive }"
    type="button"
    :title="hint"
    :aria-label="hint"
    @click.stop="toggle"
  >
    <span class="task-timer-btn__icon">
      <AppIcon :name="isActive ? 'stop' : 'play'" :size="12" />
    </span>
    <span v-if="isActive" class="task-timer-btn__time">{{ runningLabel }}</span>
    <span v-else-if="totalLabel" class="task-timer-btn__time">
      {{ totalLabel }}
    </span>
  </button>
</template>
