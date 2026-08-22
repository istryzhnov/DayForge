<script setup lang="ts">
import { useContextMenu } from '../../../composables/useContextMenu'

const props = defineProps<{
  x: number
  y: number
  isDone: boolean
  canSetAsProject: boolean
  canAddChild: boolean
  isProject: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'add-to-this'): void
  (e: 'toggle-check'): void
  (e: 'set-as-project'): void
  (e: 'show-habit'): void
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
      v-if="canSetAsProject"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('set-as-project')
          emit('close')
        }
      "
    >
      Set as project
    </button>
    <button
      v-if="canAddChild"
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
      v-if="isProject"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('show-habit')
          emit('close')
        }
      "
    >
      Show habit
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
