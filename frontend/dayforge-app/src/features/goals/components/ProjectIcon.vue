<script setup lang="ts">
import { computed } from 'vue'
import { findProjectIcon } from '../icons/projectIcons'

const props = defineProps<{ icon: string | undefined }>()

const paths = computed(() => findProjectIcon(props.icon)?.paths ?? [])
</script>

<template>
  <svg
    v-if="paths.length"
    class="project-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="d in paths" :key="d" :d="d" />
  </svg>
</template>
