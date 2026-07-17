<script setup lang="ts">
import { ref } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { ID } from '../entities/types'

type MajorTaskOption = {
  id: ID
  title: string
  goalTitle: string
}

defineProps<{
  goals: Goal[]
  majorTaskOptions: MajorTaskOption[]
}>()

const emit = defineEmits<{
  (e: 'attach-minor', majorTemplateId: ID, title: string): void
  (
    e: 'create-major-and-minor',
    goalId: ID,
    majorTitle: string,
    minorTitle: string,
  ): void
}>()

const mode = ref<'attach' | 'create'>('attach')

const selectedMajorID = ref('')
const attachTitle = ref('')

const selectedGoalId = ref<ID | ''>('')
const newMajorTitle = ref('')
const newMinorTitle = ref('')
function submitAttach() {
  if (!selectedMajorID.value) return
  const title = attachTitle.value.trim()
  if (!title) return

  emit('attach-minor', selectedMajorID.value, title)
  attachTitle.value = ''
}

function submitCreate() {
  if (!selectedGoalId.value) return
  const majorTitle = newMajorTitle.value.trim()
  const minorTitle = newMinorTitle.value.trim()
  if (!majorTitle || !minorTitle) return

  emit('create-major-and-minor', selectedGoalId.value, majorTitle, minorTitle)
  newMajorTitle.value = ''
  newMinorTitle.value = ''
}
</script>
<template>
  <div class="goal-form-card all-mode-composer">
    <div class="composer-mode-switch">
      <button
        type="button"
        class="btn btn-ghost"
        :class="{ active: mode === 'attach' }"
        @click="mode = 'attach'"
      >
        Attach to existing major
      </button>
      <button
        type="button"
        class="btn btn-ghost"
        :class="{ active: mode === 'create' }"
        @click="mode = 'create'"
      >
        Create new major
      </button>
    </div>
    <div v-if="mode === 'attach'" class="composer-fields">
      <select v-model="selectedMajorID">
        <option value="" disabled>Select major task</option>
        <option
          v-for="option in majorTaskOptions"
          :key="option.id"
          :value="option.id"
        >
          {{ option.title }} ({{ option.goalTitle }})
        </option>
      </select>
      <input
        v-model="attachTitle"
        type="text"
        placeholder="New minor task title"
        @keydown.enter="submitAttach"
      />
      <button class="btn btn-primary" @click="submitAttach">
        Add Minor Task
      </button>
    </div>
    <div v-else class="composer-fields">
      <select v-model="selectedGoalId">
        <option value="" disabled>Select goal</option>
        <option v-for="goal in goals" :key="goal.id" :value="goal.id">
          {{ goal.title }}
        </option>
      </select>

      <input
        v-model="newMajorTitle"
        type="text"
        placeholder="New major task title"
      />

      <input
        v-model="newMinorTitle"
        type="text"
        placeholder="New minor task title"
        @keydown.enter="submitCreate"
      />

      <button class="btn btn-primary" @click="submitCreate">
        Add Major + Minor
      </button>
    </div>
  </div>
</template>
