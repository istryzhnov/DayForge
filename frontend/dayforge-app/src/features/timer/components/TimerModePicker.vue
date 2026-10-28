<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TimerMode } from '../../../entities/TimerEntity'
import { MODE_OPTIONS } from '../composables/useTimerView'

defineProps<{ mode: TimerMode }>()

const emit = defineEmits<{ (e: 'select', mode: TimerMode): void }>()

const { t } = useI18n()
</script>

<template>
  <div
    class="ui-tabs timer-mode"
    role="tablist"
    :aria-label="t('timer.modeLabel')"
  >
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
      {{ t(option.labelKey) }}
    </button>
  </div>
</template>
