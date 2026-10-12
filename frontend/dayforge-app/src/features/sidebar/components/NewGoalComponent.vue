<script setup lang="ts">
import { useNewGoalFormState } from '../composables/useNewGoalFormState'
import { GOAL_COLOR_PRESETS } from '../../../entities/constants'

const COLOR_NAMES = ['Lime', 'Orange', 'Cyan', 'Yellow', 'Pink', 'Violet']

const emit = defineEmits<{
  (e: 'submit', title: string, description: string, color: string): void
  (e: 'cancel'): void
}>()

const { title, description, color, submit, cancel } = useNewGoalFormState({
  onSubmit: (nextTitle, nextDescription, nextColor) =>
    emit('submit', nextTitle, nextDescription, nextColor),
  onCancel: () => emit('cancel'),
})

const swatches = GOAL_COLOR_PRESETS.map((value, index) => ({
  value,
  name: COLOR_NAMES[index],
}))
</script>
<template>
  <Teleport to="body">
    <section class="new-goal-modal">
      <div class="modal-overlay" @click="$emit('cancel')"></div>
      <div class="modal-card">
        <h3>New Project</h3>
        <input
          v-model="title"
          type="text"
          placeholder="Project name"
          @keydown.enter="submit"
        />
        <textarea
          v-model="description"
          placeholder="Project description"
          @keydown.enter="submit"
        ></textarea>
        <div class="new-goal-colors" role="group" aria-label="Project colour">
          <button
            v-for="swatch in swatches"
            :key="swatch.value"
            class="new-goal-swatch"
            :class="{ active: color === swatch.value }"
            type="button"
            :style="{ backgroundColor: swatch.value }"
            :aria-label="swatch.name"
            :aria-pressed="color === swatch.value"
            @click="color = swatch.value"
          ></button>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="cancel">Cancel</button>
          <button class="btn btn-primary" @click="submit">Add Project</button>
        </div>
      </div>
    </section>
  </Teleport>
</template>
