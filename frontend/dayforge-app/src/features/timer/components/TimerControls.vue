<script setup lang="ts">
withDefaults(
  defineProps<{
    primaryLabel: string
    canStop: boolean
    canSkip: boolean
    size?: 'compact' | 'large'
  }>(),
  { size: 'compact' },
)

const emit = defineEmits<{
  (e: 'primary'): void
  (e: 'stop'): void
  (e: 'skip'): void
}>()
</script>

<template>
  <div class="timer-controls" :class="`timer-controls--${size}`">
    <button class="btn btn-primary" type="button" @click="emit('primary')">
      {{ primaryLabel }}
    </button>

    <button
      v-if="canSkip"
      class="btn btn-ghost"
      type="button"
      title="End this phase and move to the next"
      @click="emit('skip')"
    >
      Skip
    </button>

    <button
      v-if="canStop"
      class="btn btn-ghost"
      type="button"
      title="Stop and record what has been worked"
      @click="emit('stop')"
    >
      Stop
    </button>
  </div>
</template>
