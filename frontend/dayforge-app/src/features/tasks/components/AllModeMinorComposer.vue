<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import type { MajorTaskOption } from '../../../entities/TaskEntity'
import { useAllModeMinorComposerState } from '../composables/useAllModeMinorComposerState'

const props = defineProps<{
  goals: Goal[]
  majorTaskOptions: MajorTaskOption[]
}>()

const emit = defineEmits<{
  (e: 'create-minor', title: string, goalId?: ID, majorTemplateId?: ID): void
}>()

const {
  selectedGoalId,
  selectedMajorId,
  minorTitle,
  filteredMajorTaskOptions,
  submitMinor,
} = useAllModeMinorComposerState(props, {
  onCreateMinor: (title, goalId, majorTemplateId) =>
    emit('create-minor', title, goalId, majorTemplateId),
})
</script>
<template>
  <div class="goal-form-card all-mode-composer">
    <div class="composer-fields">
      <select v-model="selectedGoalId">
        <option value="">Only in All Goals</option>
        <option v-for="goal in goals" :key="goal.id" :value="goal.id">
          {{ goal.title }}
        </option>
      </select>

      <select v-model="selectedMajorId">
        <option value="">No major task</option>
        <option
          v-for="option in filteredMajorTaskOptions"
          :key="option.id"
          :value="option.id"
        >
          {{ option.title }} ({{ option.goalTitle }})
        </option>
      </select>

      <input
        v-model="minorTitle"
        type="text"
        placeholder="New minor task title"
        @keydown.enter="submitMinor"
      />

      <button class="btn btn-primary" @click="submitMinor">
        Add Minor Task
      </button>
    </div>
  </div>
</template>
