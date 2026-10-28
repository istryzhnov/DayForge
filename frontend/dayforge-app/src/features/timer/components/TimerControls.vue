<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { shortcutTitle } from '../../../composables/useHotkeys'
import AppIcon from '../../../components/AppIcon.vue'
import type { AppIconName } from '../../../components/appIconPaths'

const { t } = useI18n()

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

    <!-- Large: the same size as the main button, outlined, so the pair reads
         as one row of actions. -->
    <button
      v-if="canSkip"
      :class="size === 'large' ? 'timer-controls__secondary' : 'btn btn-ghost'"
      type="button"
      :title="t('timer.skipTitle')"
      @click="emit('skip')"
    >
      <AppIcon v-if="size === 'large'" name="chevron-right" :size="16" />
      <span>{{ t('timer.skip') }}</span>
    </button>

    <button
      v-if="canStop"
      :class="size === 'large' ? 'timer-controls__secondary' : 'btn btn-ghost'"
      type="button"
      :title="t('timer.stopTitle')"
      @click="emit('stop')"
    >
      <AppIcon v-if="size === 'large'" name="stop" :size="16" />
      <span>{{ t('timer.stop') }}</span>
    </button>
  </div>
</template>
