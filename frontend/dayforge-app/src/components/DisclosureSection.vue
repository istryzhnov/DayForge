<script setup lang="ts">
defineProps<{
  label: string
  open?: boolean
}>()
</script>

<template>
  <details class="disclosure" :open="open">
    <summary class="disclosure__summary">{{ label }}</summary>
    <div class="disclosure__body">
      <slot />
    </div>
  </details>
</template>
