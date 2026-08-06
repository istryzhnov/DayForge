<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  x: number
  y: number
  canCheck: boolean
  isDone: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'add-to-this'): void
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
          emit('edit')
          emit('close')
        }
      "
    >
      Edit
    </button>
    <button
      v-if="canCheck"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('toggle-check')
          emit('close')
        }
      "
    >
      {{ isDone ? 'Mark as not done' : 'Check it' }}
    </button>
    <button
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('add-to-this')
          emit('close')
        }
      "
    >
      Add to this
    </button>
    <button
      class="task-context-menu__item task-context-menu__item--soon"
      type="button"
      disabled
      title="Coming soon"
    >
      Set timer <span class="task-context-menu__badge">Soon</span>
    </button>
    <div class="task-context-menu__divider"></div>
    <button
      class="task-context-menu__item task-context-menu__item--danger"
      type="button"
      @click="
        () => {
          emit('delete')
          emit('close')
        }
      "
    >
      Delete
    </button>
  </div>
</template>
