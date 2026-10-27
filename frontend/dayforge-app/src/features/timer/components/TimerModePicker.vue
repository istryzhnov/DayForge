<script setup lang="ts">
import type { TimerMode } from '../../../entities/TimerEntity'
import { MODE_OPTIONS } from '../composables/useTimerView'

defineProps<{ mode: TimerMode }>()

const emit = defineEmits<{ (e: 'select', mode: TimerMode): void }>()
</script>

<template>
  <div class="ui-tabs timer-mode" role="tablist" aria-label="Timer mode">
    <button
      v-for="option in MODE_OPTIONS"
      :key="option.id"
      class="ui-tab"
      :class="{ 'is-active': option.id === mode }"
      type="button"
      role="tab"
      :aria-selected="option.id === mode"
      @click="emit('select', option.id)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
