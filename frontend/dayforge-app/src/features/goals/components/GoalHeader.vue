<script setup lang="ts">
import type { GoalTheme } from '../../../entities/GoalEntity'
import { useGoalHeaderMenu } from '../composables/useGoalHeaderMenu'
import { swatchStyle } from '../../../composables/inputValue'

const props = defineProps<{
  title: string
  description: string
  status: string
  totalCount: number
  projectCount: number
  taskCount: number
  showSettings: boolean
  goalTheme?: GoalTheme
}>()

const emit = defineEmits<{
  (e: 'delete-goal'): void
  (e: 'change-color', color: string | undefined): void
}>()

const {
  colorPresets,
  showMenu,
  toggleMenu,
  pickColor,
  resetColor,
  openProjectAppearance,
  confirmDelete,
} = useGoalHeaderMenu(props, {
  onChangeColor: (color) => emit('change-color', color),
  onDeleteGoal: () => emit('delete-goal'),
})
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
            :class="{ active: goalTheme?.accent === color }"
            :style="swatchStyle(color)"
            type="button"
            :aria-label="`Use color ${color}`"
            @click="pickColor(color)"
          ></button>
        </div>
        <button
          class="goal-settings__item"
          type="button"
          @click="openProjectAppearance"
        >
          More colours…
        </button>
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
      <h3>Total</h3>
      <p>{{ totalCount }}</p>
    </article>
    <article class="kpi">
      <h3>Projects</h3>
      <p>{{ projectCount }}</p>
    </article>
    <article class="kpi">
      <h3>Tasks</h3>
      <p>{{ taskCount }}</p>
    </article>
  </div>
</template>
