<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
import { useTour } from '../composables/useTour'

/** Shows while the tour runs; a click brings back the bubble that was closed. */
const { running, stepNumber, stepCount, reopen } = useTour()
</script>

<template>
  <button
    v-if="running"
    class="tour-pill"
    type="button"
    :aria-label="`Getting started, step ${stepNumber} of ${stepCount}. Show this step`"
    @click="reopen"
  >
    <AppIcon name="target" :size="14" />
    <span class="tour-pill__label">Getting started</span>
    <span class="tour-pill__count">{{ stepNumber }}/{{ stepCount }}</span>
  </button>
</template>
