<script setup lang="ts">
import { ref } from 'vue'
import { GOAL_COLOR_PRESETS } from '../../../entities/constants'

// Widen from readonly literal tuple to a plain string array for template binding.
const colorPresets: string[] = [...GOAL_COLOR_PRESETS]

const props = defineProps<{
  title: string
  description: string
  status: string
  totalCount: number
  majorCount: number
  subCount: number
  showSettings: boolean
  accentColor?: string
}>()

const emit = defineEmits<{
  (e: 'delete-goal'): void
  (e: 'change-color', color: string | undefined): void
}>()

const showMenu = ref(false)

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function closeMenu() {
  showMenu.value = false
}

function pickColor(color: string) {
  emit('change-color', color)
  closeMenu()
}

function resetColor() {
  emit('change-color', undefined)
  closeMenu()
}

function confirmDelete() {
  closeMenu()
  if (window.confirm(`Delete goal "${props.title}"? This cannot be undone.`)) {
    emit('delete-goal')
  }
}

function swatchStyle(color: string): Record<string, string> {
  return { backgroundColor: color }
}
</script>

<template>
  <header class="goal-panel-header">
    <div>
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
    </div>

    <div v-if="showSettings" class="goal-settings">
      <button
        class="goal-settings__trigger"
        type="button"
        aria-label="Goal settings"
        @click="toggleMenu"
      >
        ⚙
      </button>

      <div v-if="showMenu" class="goal-settings__menu">
        <p class="goal-settings__label">Color</p>
        <div class="goal-settings__palette">
          <button
            v-for="color in colorPresets"
            :key="color"
            class="goal-settings__swatch"
            :class="{ active: accentColor === color }"
            :style="swatchStyle(color)"
            type="button"
            :aria-label="`Use color ${color}`"
            @click="pickColor(color)"
          ></button>
        </div>
        <button class="goal-settings__item" type="button" @click="resetColor">
          Use theme default
        </button>
        <div class="goal-settings__divider"></div>
        <button
          class="goal-settings__item goal-settings__item--danger"
          type="button"
          @click="confirmDelete"
        >
          Delete goal
        </button>
      </div>
    </div>
  </header>
  <div class="goal-kpi-row">
    <article class="kpi">
      <h3>Total Tasks</h3>
      <p>{{ totalCount }}</p>
    </article>
    <article class="kpi">
      <h3>Major Tasks</h3>
      <p>{{ majorCount }}</p>
    </article>
    <article class="kpi">
      <h3>Subtasks</h3>
      <p>{{ subCount }}</p>
    </article>
  </div>
</template>
