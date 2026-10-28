<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
import type { CoachPosition } from '../composables/coachPosition'

/**
 * The bubble itself: markup and close button, shared by the per-screen tips
 * and the getting-started tour. Positioning is done by the caller. With no
 * position the bubble sits docked at the bottom of the screen, without an arrow.
 */
defineProps<{
  title: string
  body: string
  position?: CoachPosition | null
  closeLabel: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div
    class="coach-mark"
    :class="{ 'is-docked': !position }"
    role="note"
    :aria-label="title"
    :data-placement="position?.placement"
    :style="
      position ? { left: `${position.left}px`, top: `${position.top}px` } : {}
    "
  >
    <span
      v-if="position"
      class="coach-mark__arrow"
      :style="
        position.placement === 'top' || position.placement === 'bottom'
          ? { left: `${position.arrow}px` }
          : { top: `${position.arrow}px` }
      "
      aria-hidden="true"
    />

    <p v-if="$slots.eyebrow" class="coach-mark__eyebrow">
      <slot name="eyebrow" />
    </p>

    <div class="coach-mark__head">
      <strong class="coach-mark__title">{{ title }}</strong>
      <button
        class="coach-mark__close"
        type="button"
        :aria-label="closeLabel"
        @click="emit('close')"
      >
        <AppIcon name="close" :size="12" />
      </button>
    </div>

    <p class="coach-mark__body">{{ body }}</p>

    <div v-if="$slots.actions" class="coach-mark__actions">
      <slot name="actions" />
    </div>
  </div>
</template>
