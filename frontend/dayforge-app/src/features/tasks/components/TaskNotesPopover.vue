<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { createFocusTrap } from '../../../composables/useFocusTrap'
import { useI18n } from 'vue-i18n'
import { NOTES_MAX_LENGTH } from '../../../composables/goalSpace/notes'
import {
  isCommitShortcut,
  useNotesDraft,
  useTextareaFit,
} from '../../../composables/useNotesDraft'
import { useMediaQuery } from '../../../composables/useMediaQuery'
import {
  placePopover,
  type PopoverPosition,
} from '../composables/useNotesPopover'

const props = defineProps<{
  title: string
  notes?: string
  /** The button that opened the popover; clicks on it are not "outside". */
  anchor: HTMLElement | null
}>()

const emit = defineEmits<{
  (e: 'save', notes: string): void
  /** `returnFocus` is false when the user clicked somewhere else. */
  (e: 'close', returnFocus: boolean): void
}>()

/** Narrow or touch screens get a bottom sheet instead of a floating panel. */
const isSheet = useMediaQuery('(max-width: 600px), (pointer: coarse)')

const { t } = useI18n()
const root = useTemplateRef<HTMLElement>('root')
const textarea = useTemplateRef<HTMLTextAreaElement>('textarea')
const position = ref<PopoverPosition>({ left: 0, top: 0 })

const { draft, commit, revert } = useNotesDraft(
  () => props.notes ?? '',
  (next) => emit('save', next),
)
useTextareaFit(textarea, draft)

function reposition() {
  if (isSheet.value || !props.anchor || !root.value) return
  position.value = placePopover(
    props.anchor.getBoundingClientRect(),
    { width: root.value.offsetWidth, height: root.value.offsetHeight },
    { width: window.innerWidth, height: window.innerHeight },
  )
}

/** Saves whatever is typed, then closes. Used by ×, outside clicks and Ctrl/Cmd+Enter. */
function commitAndClose(returnFocus = true) {
  commit()
  emit('close', returnFocus)
}

/** Tab stays inside the note; Escape throws the edit away and returns focus to the note button. */
const trap = createFocusTrap(() => root.value, {
  modal: false,
  initialFocus: () => null,
  onEscape: () => {
    revert()
    emit('close', true)
  },
})

function onKeydown(event: KeyboardEvent) {
  if (isCommitShortcut(event)) {
    event.preventDefault()
    commitAndClose()
  }
}

function onPointerDownOutside(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (root.value?.contains(target)) return
  if (props.anchor?.contains(target)) return
  commitAndClose(false)
}

onMounted(() => {
  reposition()
  // Before the textarea takes focus, so the trap remembers the note button.
  trap.activate()
  const field = textarea.value
  if (field) {
    field.focus()
    field.setSelectionRange(field.value.length, field.value.length)
  }
  document.addEventListener('pointerdown', onPointerDownOutside, true)
  window.addEventListener('resize', reposition)
  window.addEventListener('scroll', reposition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDownOutside, true)
  window.removeEventListener('resize', reposition)
  window.removeEventListener('scroll', reposition, true)
  trap.deactivate()
  // Covers an unmount from outside (the row going away, another note opening).
  commit()
})

defineExpose({ commitAndClose })
</script>

<template>
  <Teleport to="body">
    <div
      ref="root"
      class="notes-pop"
      :class="{ 'notes-pop--sheet': isSheet }"
      role="dialog"
      :aria-label="t('tasks.notes')"
      :style="
        isSheet
          ? undefined
          : { left: `${position.left}px`, top: `${position.top}px` }
      "
      @keydown="onKeydown"
    >
      <header class="notes-pop__head">
        <span class="notes-pop__title" :title="title">{{ title }}</span>
        <button
          type="button"
          class="notes-pop__close"
          :aria-label="t('tasks.closeNotes')"
          @click="commitAndClose(true)"
        >
          <AppIcon name="close" :size="14" />
        </button>
      </header>

      <textarea
        ref="textarea"
        v-model="draft"
        class="notes-pop__text"
        rows="3"
        :maxlength="NOTES_MAX_LENGTH"
        :aria-label="t('tasks.writeNote')"
        :placeholder="t('tasks.writeNote')"
        @blur="commit"
      ></textarea>

      <p class="notes-pop__hint">
        {{ isSheet ? t('tasks.notesHintTouch') : t('tasks.notesHint') }}
      </p>
    </div>
  </Teleport>
</template>
