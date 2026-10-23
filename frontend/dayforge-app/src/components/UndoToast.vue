<script setup lang="ts">
import { useUndoToast } from '../composables/useUndoToast'

const { pending, runPendingAction, dismissUndo, undoWindowMs } = useUndoToast()

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
    <button
      class="undo-toast__action"
      type="button"
      @click="runPendingAction(0)"
    >
      {{ pending.actionLabel }}
    </button>
    <button
      v-for="(action, index) in pending.secondary"
      :key="action.label"
      class="undo-toast__action undo-toast__action--secondary"
      type="button"
      @click="runPendingAction(index + 1)"
    >
      {{ action.label }}
    </button>
    <button
      class="undo-toast__close"
      type="button"
      aria-label="Dismiss"
      @click="dismissUndo"
    >
      ×
    </button>
    <span
      v-if="!pending.sticky"
      class="undo-toast__timer"
      :style="timerStyle(undoWindowMs)"
    ></span>
  </div>
</template>
