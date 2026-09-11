<script setup lang="ts">
import { useUndoToast } from '../composables/useUndoToast'

const { pending, performUndo, dismissUndo, undoWindowMs } = useUndoToast()

function timerStyle(durationMs: number) {
  return { animationDuration: `${durationMs}ms` }
}
</script>

<template>
  <!-- Keyed by id so restarting the countdown replays the progress animation
       when a second delete supersedes the first. -->
  <div
    v-if="pending"
    :key="pending.id"
    class="undo-toast"
    role="status"
    aria-live="polite"
  >
    <span class="undo-toast__label">{{ pending.label }}</span>
    <button class="undo-toast__action" type="button" @click="performUndo">
      Undo
    </button>
    <button
      class="undo-toast__close"
      type="button"
      aria-label="Dismiss"
      @click="dismissUndo"
    >
      ×
    </button>
    <span class="undo-toast__timer" :style="timerStyle(undoWindowMs)"></span>
  </div>
</template>
