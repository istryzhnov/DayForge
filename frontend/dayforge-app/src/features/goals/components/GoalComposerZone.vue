<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ID, Priority } from '../../../entities/types'
import type { MajorTaskOption } from '../../../entities/TaskEntity'
import type { Goal } from '../../../entities/GoalEntity'
import AllModeMinorComposer from '../../tasks/components/AllModeMinorComposer.vue'

const props = defineProps<{
  isAllMode: boolean
  goalId?: ID
  goals: Goal[]
  majorTaskOptions: MajorTaskOption[]
}>()

const emit = defineEmits<{
  (e: 'add-task', title: string, priority: Priority): void
  (e: 'add-to-major', parentTemplateId: ID, title: string, priority: Priority): void
  (e: 'create-all-mode-minor', title: string, goalId?: ID, majorId?: ID): void
}>()

const isOpen = ref(false)
const title = ref('')
const selectingMajor = ref(false)
const selectedMajorId = ref<ID | ''>('')

const goalMajorOptions = computed(() => {
  if (!props.goalId) return []
  return props.majorTaskOptions.filter((major) => major.goalId === props.goalId)
})

const canAttachToMajor = computed(() => goalMajorOptions.value.length > 0)

function toggleComposer() {
  isOpen.value = !isOpen.value
}

function toggleMajorSelect() {
  selectingMajor.value = !selectingMajor.value
  if (!selectingMajor.value) {
    selectedMajorId.value = ''
  }
}

function submitGoalTask() {
  const nextTitle = title.value.trim()
  if (!nextTitle) return

  if (selectingMajor.value && selectedMajorId.value) {
    emit('add-to-major', selectedMajorId.value, nextTitle, 'minor')
  } else {
    emit('add-task', nextTitle, 'major')
  }

  title.value = ''
}
</script>

<template>
  <section class="composer-drawer">
    <div class="composer-toolbar">
      <button class="btn btn-primary" @click="toggleComposer">
        {{ isOpen ? 'Hide composer' : 'Add Task' }}
      </button>

      <button
        v-if="!isAllMode"
        class="btn btn-ghost"
        @click="toggleMajorSelect"
      >
        {{ selectingMajor ? 'Hide Major' : 'Select Major' }}
      </button>
    </div>

    <div v-if="isOpen" class="composer-body">
      <template v-if="!isAllMode">
        <div class="goal-form-card">
          <input
            v-model="title"
            type="text"
            :placeholder="
              selectingMajor
                ? 'New minor task title'
                : 'New major task title'
            "
            @keydown.enter="submitGoalTask"
          />

          <button class="btn btn-primary" @click="submitGoalTask">
            Add Task
          </button>
        </div>

        <div v-if="selectingMajor" class="goal-form-card composer-major-select">
          <select v-model="selectedMajorId" :disabled="!canAttachToMajor">
            <option value="">Without major (create new major)</option>
            <option
              v-for="major in goalMajorOptions"
              :key="major.id"
              :value="major.id"
            >
              {{ major.title }}
            </option>
          </select>
        </div>

        <p v-if="selectingMajor && !canAttachToMajor" class="goal-hint">
          No major tasks yet. Add a major task first, or submit without selecting
          major.
        </p>
      </template>

      <AllModeMinorComposer
        v-else
        :goals="goals"
        :major-task-options="majorTaskOptions"
        @create-minor="
          (nextTitle: string, goalId: ID | undefined, majorId: ID | undefined) =>
            emit('create-all-mode-minor', nextTitle, goalId, majorId)
        "
      />
    </div>
  </section>
</template>
