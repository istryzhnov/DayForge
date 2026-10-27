<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { computed } from 'vue'
import { useShortcutTip } from '../composables/useShortcutTip'
import { useSettings } from '../composables/useSettings'

const { tipVisible, dismissTip } = useShortcutTip()
const { settings } = useSettings()

const isOpen = computed(
  () => tipVisible.value && settings.behavior.keyboardShortcuts,
)
</script>

<template>
  <div v-if="isOpen" class="shortcut-tip" role="status" aria-live="polite">
    <p class="shortcut-tip__text">
      Tip: press <kbd class="kbd-badge">N</kbd> to add a task from anywhere.
      Press <kbd class="kbd-badge">?</kbd> for all shortcuts.
    </p>
    <button
      class="shortcut-tip__close"
      type="button"
      aria-label="Dismiss tip"
      @click="dismissTip"
    >
      <AppIcon name="close" :size="14" />
    </button>
  </div>
</template>
