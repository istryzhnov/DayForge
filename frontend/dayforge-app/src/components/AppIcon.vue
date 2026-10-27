<script setup lang="ts">
import { computed } from 'vue'
import { APP_ICON_PATHS, type AppIconName } from './appIconPaths'

const props = withDefaults(defineProps<{ name: AppIconName; size?: number }>(), {
  size: 16,
})

const paths = computed<readonly string[]>(() => APP_ICON_PATHS[props.name])
</script>

<template>
  <!-- Stroke-only and currentColor, so an icon takes the colour of its button. -->
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="d in paths" :key="d" :d="d" />
  </svg>
</template>

<style scoped>
/* Block-level so a parent grid or flex row centres it, not the text baseline. */
.app-icon {
  display: block;
  flex: none;
}
</style>
