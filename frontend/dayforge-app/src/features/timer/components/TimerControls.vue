<script setup lang="ts">
import { shortcutTitle } from '../../../composables/useHotkeys'
import AppIcon from '../../../components/AppIcon.vue'
import type { AppIconName } from '../../../components/appIconPaths'

withDefaults(
  defineProps<{
    primaryLabel: string
    primaryIcon?: AppIconName
    canStop: boolean
    canSkip: boolean
    size?: 'compact' | 'large'
  }>(),
  { size: 'compact', primaryIcon: 'play' },
)

const emit = defineEmits<{
  (e: 'primary'): void
  (e: 'stop'): void
  (e: 'skip'): void
}>()
</script>

<template>
  <div class="timer-controls" :class="`timer-controls--${size}`">
    <button
      v-if="size === 'large'"
      class="timer-controls__primary"
      type="button"
      :title="shortcutTitle(primaryLabel, 'Space')"
      @click="emit('primary')"
    >
      <AppIcon :name="primaryIcon" :size="16" />
      <span>{{ primaryLabel }}</span>
    </button>
    <button
      v-else
      class="btn btn-primary"
      type="button"
      :title="shortcutTitle(primaryLabel, 'Space')"
      @click="emit('primary')"
    >
      {{ primaryLabel }}
    </button>

    <button
      v-if="canSkip"
      :class="size === 'large' ? 'ui-chip' : 'btn btn-ghost'"
      type="button"
      title="End this phase and move to the next"
      @click="emit('skip')"
    >
      Skip
    </button>

    <button
      v-if="canStop"
      :class="size === 'large' ? 'ui-chip' : 'btn btn-ghost'"
      type="button"
      title="Stop and record what has been worked"
      @click="emit('stop')"
    >
      Stop
    </button>
  </div>
</template>
