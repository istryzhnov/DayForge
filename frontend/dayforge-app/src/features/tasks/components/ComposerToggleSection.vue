<script setup lang="ts">
defineProps<{
  label: string
}>()

const isEnabled = defineModel<boolean>({ required: true })
</script>

<template>
  <div class="composer-section">
    <label class="composer-section__toggle">
      <input v-model="isEnabled" type="checkbox" />
      <span>{{ label }}</span>
    </label>

    <div v-if="isEnabled" class="composer-section__body">
      <slot />
    </div>
  </div>
</template>
