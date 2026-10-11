<script setup lang="ts">
import type { Goal, GoalTheme } from '../../../entities/GoalEntity'
import type { GoalStatus } from '../../../entities/types'
import { useTheme } from '../../../composables/useTheme'
import ProjectThemeEditor from './ProjectThemeEditor.vue'
import ProjectBillingSection from './ProjectBillingSection.vue'
import ProjectIcon from '../../goals/components/ProjectIcon.vue'
import DisclosureSection from '../../../components/DisclosureSection.vue'
import { useProjectSection } from '../composables/useProjectSection'

const props = defineProps<{ goal: Goal }>()

const emit = defineEmits<{
  (e: 'update-details', title: string, description: string): void
  (e: 'update-status', status: GoalStatus): void
  (e: 'update-theme', theme: GoalTheme | undefined): void
  (e: 'update-rate', hourlyRate: number | undefined): void
  (e: 'update-icon', icon: string | undefined): void
  (e: 'delete'): void
}>()

const { themeMode, surfaces, effectivePalette } = useTheme()

const {
  title,
  description,
  commitTitle,
  commitDescription,
  statusOptions,
  status,
  statusHint,
  setStatus,
  iconOptions,
  icon,
  setIcon,
  confirmDelete,
} = useProjectSection(props, {
  onUpdateDetails: (nextTitle, nextDescription) =>
    emit('update-details', nextTitle, nextDescription),
  onUpdateStatus: (next) => emit('update-status', next),
  onUpdateIcon: (next) => emit('update-icon', next),
  onDelete: () => emit('delete'),
})
</script>

<template>
  <div class="settings-section">
    <p class="sidebar-caption">Name</p>

    <label class="settings-field">
      Project name
      <input
        v-model="title"
        type="text"
        maxlength="80"
        @change="commitTitle"
        @keydown.enter="commitTitle"
        @blur="commitTitle"
      />
    </label>

    <DisclosureSection label="Icon">
      <div class="project-icon-picker">
        <button
          class="project-icon-option project-icon-option--none"
          :class="{ active: !icon }"
          type="button"
          aria-label="No icon"
          :aria-pressed="!icon"
          @click="setIcon(undefined)"
        >
          None
        </button>
        <button
          v-for="option in iconOptions"
          :key="option.id"
          class="project-icon-option"
          :class="{ active: icon === option.id }"
          type="button"
          :aria-label="option.label"
          :aria-pressed="icon === option.id"
          @click="setIcon(option.id)"
        >
          <ProjectIcon :icon="option.id" />
        </button>
      </div>
    </DisclosureSection>

    <DisclosureSection label="Description" :open="Boolean(goal.description)">
      <label class="settings-field">
        Description
        <textarea
          v-model="description"
          rows="2"
          maxlength="280"
          placeholder="What this project is for"
          @change="commitDescription"
          @blur="commitDescription"
        ></textarea>
      </label>
    </DisclosureSection>

    <p class="sidebar-caption">Status</p>

    <div class="settings-chips">
      <button
        v-for="option in statusOptions"
        :key="option.id"
        class="theme-chip"
        :class="{ active: status === option.id }"
        type="button"
        @click="setStatus(option.id)"
      >
        {{ option.label }}
      </button>
    </div>

    <p class="settings-group-hint">{{ statusHint }}</p>

    <DisclosureSection label="Colours">
      <ProjectThemeEditor
        :goal="goal"
        :mode="themeMode"
        :surfaces="surfaces"
        :palette="effectivePalette"
        @update="(theme) => emit('update-theme', theme)"
      />
    </DisclosureSection>

    <ProjectBillingSection
      :goal="goal"
      @update-rate="(rate) => emit('update-rate', rate)"
    />

    <DisclosureSection label="Danger zone">
      <div class="settings-danger">
        <p class="settings-group-hint">
          Deleting the project also deletes every task in it and every day row
          they produced. Only a backup file can bring it back.
        </p>
        <button
          class="btn btn-ghost settings-action settings-action--danger"
          type="button"
          @click="confirmDelete"
        >
          Delete this project
        </button>
      </div>
    </DisclosureSection>
  </div>
</template>
