<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useNewGoalFormState } from '../composables/useNewGoalFormState'
import { GOAL_COLOR_PRESETS } from '../../../entities/constants'

const { t } = useI18n()

/** Message keys for the swatches, in the same order as the colour presets. */
const COLOR_NAME_KEYS = [
  'sidebar.colourOrange',
  'sidebar.colourLime',
  'sidebar.colourCyan',
  'sidebar.colourYellow',
  'sidebar.colourPink',
  'sidebar.colourViolet',
]

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
  nameKey: COLOR_NAME_KEYS[index],
}))
</script>
<template>
  <Teleport to="body">
    <section class="new-goal-modal">
      <div class="modal-overlay" @click="$emit('cancel')"></div>
      <div class="modal-card">
        <h3>{{ t('sidebar.newProject') }}</h3>
        <input
          v-model="title"
          type="text"
          :placeholder="t('sidebar.projectName')"
          @keydown.enter="submit"
        />
        <textarea
          v-model="description"
          :placeholder="t('sidebar.projectDescription')"
          @keydown.enter="submit"
        ></textarea>
        <div
          class="new-goal-colors"
          role="group"
          :aria-label="t('sidebar.projectColour')"
        >
          <button
            v-for="swatch in swatches"
            :key="swatch.value"
            class="new-goal-swatch"
            :class="{ active: color === swatch.value }"
            type="button"
            :style="{ backgroundColor: swatch.value }"
            :aria-label="t(swatch.nameKey)"
            :aria-pressed="color === swatch.value"
            @click="color = swatch.value"
          ></button>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="cancel">
            {{ t('sidebar.cancel') }}
          </button>
          <button class="btn btn-primary" @click="submit">
            {{ t('sidebar.addProject') }}
          </button>
        </div>
      </div>
    </section>
  </Teleport>
</template>
