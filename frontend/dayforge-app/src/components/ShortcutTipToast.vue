<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { computed } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import { useShortcutTip } from '../composables/useShortcutTip'
import { useSettings } from '../composables/useSettings'
import { useTour } from '../features/onboarding/composables/useTour'

const { tipVisible, dismissTip } = useShortcutTip()
const { settings } = useSettings()
const { running: tourRunning } = useTour()
const { t } = useI18n()

/** Waits while the tour runs, so two kinds of help never talk at once. */
const isOpen = computed(
  () =>
    tipVisible.value &&
    settings.behavior.keyboardShortcuts &&
    !tourRunning.value,
)
</script>

<template>
  <div v-if="isOpen" class="shortcut-tip" role="status" aria-live="polite">
    <I18nT keypath="hotkeys.tip" tag="p" class="shortcut-tip__text">
      <template #add><kbd class="kbd-badge">N</kbd></template>
      <template #help><kbd class="kbd-badge">?</kbd></template>
    </I18nT>
    <button
      class="shortcut-tip__close"
      type="button"
      :aria-label="t('hotkeys.dismissTip')"
      @click="dismissTip"
    >
      <AppIcon name="close" :size="14" />
    </button>
  </div>
</template>
