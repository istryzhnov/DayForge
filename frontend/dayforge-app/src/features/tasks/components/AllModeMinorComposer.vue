<script setup lang="ts">
import { useTemplateRef } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import type {
  MajorTaskOption,
  TaskSchedule,
} from '../../../entities/TaskEntity'
import { useAllModeMinorComposerState } from '../composables/useAllModeMinorComposerState'
import ComposerToggleSection from './ComposerToggleSection.vue'
import TaskScheduleFields from './TaskScheduleFields.vue'

const props = defineProps<{
  goals: Goal[]
  majorTaskOptions: MajorTaskOption[]
}>()

const emit = defineEmits<{
  (
    e: 'create-minor',
    title: string,
    goalId?: ID,
    majorTemplateId?: ID,
    schedule?: TaskSchedule,
  ): void
}>()

const scheduleFields =
  useTemplateRef<InstanceType<typeof TaskScheduleFields>>('scheduleFields')

const {
  isAssignEnabled,
  selectedGoalId,
  selectedMajorId,
  minorTitle,
  filteredMajorTaskOptions,
  submitMinor,
} = useAllModeMinorComposerState(
  props,
  {
    onCreateMinor: (title, goalId, majorTemplateId, schedule) =>
      emit('create-minor', title, goalId, majorTemplateId, schedule),
  },
  {
    readSchedule: () => scheduleFields.value?.buildSchedule(),
    canSubmitSchedule: () => scheduleFields.value?.isValid ?? true,
    onScheduleSubmitted: () => scheduleFields.value?.reset(),
  },
)
</script>
<template>
  <div class="goal-form-card all-mode-composer">
    <div class="composer-fields">
      <input
        v-model="minorTitle"
        type="text"
        placeholder="New task title"
        @keydown.enter="submitMinor"
      />

      <ComposerToggleSection
        v-model="isAssignEnabled"
        label="Add to a goal or project"
      >
        <div class="composer-assign">
          <label class="composer-assign__field">
            <span class="composer-assign__label">Goal</span>
            <select v-model="selectedGoalId">
              <option value="">Only in All Goals</option>
              <option v-for="goal in goals" :key="goal.id" :value="goal.id">
                {{ goal.title }}
              </option>
            </select>
          </label>

          <label class="composer-assign__field">
            <span class="composer-assign__label">Project</span>
            <select v-model="selectedMajorId">
              <option value="">No project</option>
              <option
                v-for="option in filteredMajorTaskOptions"
                :key="option.id"
                :value="option.id"
              >
                {{ option.title }} ({{ option.goalTitle }})
              </option>
            </select>
          </label>
        </div>
      </ComposerToggleSection>

      <TaskScheduleFields ref="scheduleFields" />

      <button class="btn btn-primary" @click="submitMinor">Add task</button>
    </div>
  </div>
</template>
