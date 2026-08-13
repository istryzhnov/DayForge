<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  x: number
  y: number
  isDone: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-check'): void
  (e: 'close'): void
}>()

const menuRef = ref<HTMLElement | null>(null)
const menuPositionStyle = computed(() => ({
  top: `${props.y}px`,
  left: `${props.x}px`,
}))

function handleOutsideClick(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div ref="menuRef" class="task-context-menu" :style="menuPositionStyle">
    <button
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('toggle-check')
          emit('close')
        }
      "
    >
      {{ isDone ? 'Mark as not done' : 'Mark as done' }}
    </button>
  </div>
</template>
