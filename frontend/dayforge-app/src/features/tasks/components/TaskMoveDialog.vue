<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import type {
  MajorTaskOption,
  TaskTemplate,
} from '../../../entities/TaskEntity'
import AppIcon from '../../../shared/ui/AppIcon.vue'
import { useFocusTrap } from '../../../shared/composables/useFocusTrap'
import { useTaskActions } from '../composables/useTaskActions'
import { useTaskMove } from '../composables/useTaskMove'

const props = defineProps<{
  template: TaskTemplate
  /** The task has subtasks, so it is a parent and cannot be filed under another. */
  hasChildren: boolean
  goals: Goal[]
  projectOptions: MajorTaskOption[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
const actions = useTaskActions()
const showInfo = ref(false)

useFocusTrap({ onEscape: () => emit('close') })

const {
  goalId,
  projectId,
  canAttachToProject,
  projectsForGoal,
  syncProjectToGoal,
  save,
} = useTaskMove(props, {
  onAssignGoal: actions.assignGoal,
  onAttachToProject: actions.attachToProject,
})

function submit() {
  save()
  emit('close')
}
</script>

<template>
  <div ref="trapRef" class="new-goal-modal" @click.self="emit('close')">
    <div class="modal-overlay" @click="emit('close')"></div>
    <div
      class="modal-card task-move"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-move-title"
    >
      <h3 id="task-move-title">
        {{ t('tasks.moveTitle', { title: template.title }) }}
      </h3>

      <label class="timer-field">
        {{ t('tasks.goal') }}
        <select v-model="goalId" @change="syncProjectToGoal">
          <option value="">{{ t('tasks.noGoal') }}</option>
          <option v-for="goal in goals" :key="goal.id" :value="goal.id">
            {{ goal.title }}
          </option>
        </select>
      </label>

      <label v-if="canAttachToProject" class="timer-field">
        {{ t('goals.project') }}
        <select v-model="projectId">
          <option value="">{{ t('tasks.onItsOwn') }}</option>
          <option
            v-for="option in projectsForGoal"
            :key="option.id"
            :value="option.id"
          >
            {{ option.title }}
          </option>
        </select>
      </label>

      <template v-else>
        <button
          type="button"
          class="ui-icon-btn"
          :title="t('common.aboutThis')"
          :aria-label="t('common.aboutThis')"
          :aria-expanded="showInfo"
          @click="showInfo = !showInfo"
        >
          <AppIcon name="info" :size="16" />
        </button>
        <p v-if="showInfo" class="settings-group-hint">
          {{ t('tasks.projectCannotNest') }}
        </p>
      </template>

      <p
        v-if="canAttachToProject && projectsForGoal.length === 0"
        class="settings-group-hint"
      >
        {{ t('tasks.goalHasNoProject') }}
      </p>

      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" @click="emit('close')">
          {{ t('common.cancel') }}
        </button>
        <button class="btn btn-primary" type="button" @click="submit">
          {{ t('tasks.move') }}
        </button>
      </div>
    </div>
  </div>
</template>
