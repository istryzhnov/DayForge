<script setup lang="ts">
import { useContextMenu } from '../../../composables/useContextMenu'

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

const { menuPositionStyle } = useContextMenu({
  getPosition: () => ({ x: props.x, y: props.y }),
  onClose: () => emit('close'),
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
