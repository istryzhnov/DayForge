<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  avatarUrl: string | null
  initial: string
  signedIn: boolean
}>()

const failed = ref(false)

watch(
  () => props.avatarUrl,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <span class="profile-avatar" :class="{ 'is-signed-out': !signedIn }">
    <img
      v-if="signedIn && avatarUrl && !failed"
      :src="avatarUrl"
      alt=""
      referrerpolicy="no-referrer"
      @error="failed = true"
    />
    <template v-else-if="signedIn">{{ initial }}</template>
    <svg
      v-else
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </svg>
  </span>
</template>
