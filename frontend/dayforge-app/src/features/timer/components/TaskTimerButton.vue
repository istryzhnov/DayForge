<script setup lang="ts">
import type { ID } from '../../../entities/types'
import { useTaskTimerButton } from '../composables/useTaskTimerButton'

const props = defineProps<{
  taskId: ID
  title: string
  goalId?: ID
  rollupTaskIds?: ID[]
}>()

const { isActive, totalLabel, runningLabel, hint, toggle } =
  useTaskTimerButton(props)
</script>

<template>
  <button
    class="task-timer-btn"
    :class="{ 'is-active': isActive }"
    type="button"
    :title="hint"
    :aria-label="hint"
    @click.stop="toggle"
  >
    <span class="task-timer-btn__icon">{{ isActive ? '■' : '▶' }}</span>
    <span v-if="isActive" class="task-timer-btn__time">{{ runningLabel }}</span>
    <span v-else-if="totalLabel" class="task-timer-btn__time">
      {{ totalLabel }}
    </span>
  </button>
</template>
