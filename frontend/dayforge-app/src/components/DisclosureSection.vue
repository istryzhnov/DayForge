<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  label: string
  open?: boolean
  /** Inside a menu the summary is one of its items, so it takes that role. */
  summaryRole?: string
}>()

const isOpen = ref(!!props.open)

function onToggle(event: Event) {
  isOpen.value = (event.target as HTMLDetailsElement).open
}
</script>

<template>
  <details class="disclosure" :open="open" @toggle="onToggle">
    <summary
      class="disclosure__summary"
      :role="summaryRole"
      :aria-expanded="isOpen"
    >
      {{ label }}
    </summary>
    <div class="disclosure__body">
      <slot />
    </div>
  </details>
</template>
