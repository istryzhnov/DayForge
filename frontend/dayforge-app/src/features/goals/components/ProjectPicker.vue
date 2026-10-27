<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '../../../components/AppIcon.vue'

export interface PickerOption {
  /** '' for no project, 'goal:<id>' or 'major:<id>'. */
  value: string
  label: string
  /** Muted text after the label, e.g. the project a block belongs to. */
  hint?: string
  color?: string
  group: 'none' | 'goal' | 'major'
}

const props = defineProps<{
  modelValue: string
  options: PickerOption[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const GROUP_LABEL: Record<PickerOption['group'], string | null> = {
  none: null,
  goal: 'Projects',
  major: 'Inside a project',
}

const isOpen = ref(false)
const activeIndex = ref(0)
const rootRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const listId = `project-picker-${Math.random().toString(36).slice(2, 8)}`

const selected = computed(
  () =>
    props.options.find((option) => option.value === props.modelValue) ??
    props.options[0],
)

/** Options with a section label in front of the first of each group. */
const rows = computed(() =>
  props.options.map((option, index) => ({
    option,
    index,
    heading:
      index === 0 || props.options[index - 1].group !== option.group
        ? GROUP_LABEL[option.group]
        : null,
  })),
)

function open() {
  isOpen.value = true
  activeIndex.value = Math.max(
    0,
    props.options.findIndex((option) => option.value === props.modelValue),
  )
  nextTick(scrollActiveIntoView)
}

function close() {
  isOpen.value = false
}

function choose(value: string) {
  emit('update:modelValue', value)
  close()
}

function scrollActiveIntoView() {
  listRef.value
    ?.querySelector<HTMLElement>(`[data-index="${activeIndex.value}"]`)
    ?.scrollIntoView({ block: 'nearest' })
}

function move(step: number) {
  const count = props.options.length
  activeIndex.value = (activeIndex.value + step + count) % count
  nextTick(scrollActiveIntoView)
}

function onKeydown(event: KeyboardEvent) {
  if (!isOpen.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      open()
    }
    return
  }
  if (event.key === 'ArrowDown') move(1)
  else if (event.key === 'ArrowUp') move(-1)
  else if (event.key === 'Home') activeIndex.value = 0
  else if (event.key === 'End') activeIndex.value = props.options.length - 1
  else if (event.key === 'Enter' || event.key === ' ') {
    choose(props.options[activeIndex.value].value)
  } else if (event.key === 'Escape' || event.key === 'Tab') {
    if (event.key === 'Escape') event.stopPropagation()
    close()
    return
  } else return
  event.preventDefault()
}

// A press anywhere outside closes the list, like a native select.
function onPointerDown(event: PointerEvent) {
  if (!rootRef.value?.contains(event.target as Node)) close()
}

watch(isOpen, (value) => {
  if (value) document.addEventListener('pointerdown', onPointerDown, true)
  else document.removeEventListener('pointerdown', onPointerDown, true)
})

onBeforeUnmount(() =>
  document.removeEventListener('pointerdown', onPointerDown, true),
)
</script>

<template>
  <div ref="rootRef" class="project-picker">
    <button
      class="task-composer__target"
      type="button"
      aria-label="Project"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-controls="listId"
      :aria-activedescendant="isOpen ? `${listId}-${activeIndex}` : undefined"
      @click="isOpen ? close() : open()"
      @keydown="onKeydown"
    >
      <span
        class="task-composer__target-dot"
        :style="selected?.color ? { background: selected.color } : undefined"
        aria-hidden="true"
      />
      <span class="ui-oneline project-picker__value">{{
        selected?.label
      }}</span>
      <AppIcon name="chevron-down" :size="12" class="project-picker__caret" />
    </button>

    <div
      v-if="isOpen"
      :id="listId"
      ref="listRef"
      class="project-picker__list"
      role="listbox"
      aria-label="Project"
    >
      <template v-for="row in rows" :key="row.option.value">
        <p v-if="row.heading" class="ui-section-label project-picker__heading">
          {{ row.heading }}
        </p>
        <div
          :id="`${listId}-${row.index}`"
          class="project-picker__option"
          :class="{ 'is-active': row.index === activeIndex }"
          role="option"
          :data-index="row.index"
          :aria-selected="row.option.value === modelValue"
          @pointerenter="activeIndex = row.index"
          @click="choose(row.option.value)"
        >
          <AppIcon
            v-if="row.option.group === 'none'"
            name="grid"
            :size="14"
            class="project-picker__icon"
          />
          <span
            v-else
            class="project-picker__dot"
            :style="
              row.option.color ? { background: row.option.color } : undefined
            "
            aria-hidden="true"
          />
          <span class="ui-oneline project-picker__label">{{
            row.option.label
          }}</span>
          <span v-if="row.option.hint" class="ui-oneline project-picker__hint">
            {{ row.option.hint }}
          </span>
          <AppIcon
            v-if="row.option.value === modelValue"
            name="check"
            :size="14"
            class="project-picker__check"
          />
        </div>
      </template>
    </div>
  </div>
</template>
