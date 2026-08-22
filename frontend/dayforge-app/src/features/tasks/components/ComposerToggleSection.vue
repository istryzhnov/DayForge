<script setup lang="ts">
defineProps<{
  label: string
}>()

/**
 * A checkbox that reveals a panel of optional composer fields. Shared so the
 * schedule block and the goal/project block stay visually identical instead of
 * drifting apart as two copies.
 */
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
