<script setup lang="ts">
import type { TimerMode } from '../../../entities/TimerEntity'
import { MODE_OPTIONS } from '../composables/useTimerView'

defineProps<{ mode: TimerMode }>()

const emit = defineEmits<{ (e: 'select', mode: TimerMode): void }>()
</script>

<template>
  <div class="settings-chips">
    <button
      v-for="option in MODE_OPTIONS"
      :key="option.id"
      class="theme-chip"
      :class="{ active: option.id === mode }"
      type="button"
      @click="emit('select', option.id)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
