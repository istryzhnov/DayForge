<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import { useSettingsMenu } from '../composables/useSettingsMenu'
import type { SettingsSection } from '../composables/useSettingsPanel'

const props = defineProps<{
  activeGoal: Goal | null
  notificationsEnabled: boolean
  dataStats: { goals: number; templates: number; kilobytes: number }
}>()

const emit = defineEmits<{
  (e: 'open', section: SettingsSection): void
}>()

const { groups } = useSettingsMenu(props)
</script>

<template>
  <div class="settings-menu">
    <section
      v-for="group in groups"
      :key="group.id"
      class="settings-menu__group"
    >
      <p class="sidebar-caption">{{ group.label }}</p>

      <button
        v-for="row in group.rows"
        :key="row.id"
        class="settings-menu__row"
        type="button"
        :disabled="row.disabled"
        @click="emit('open', row.id)"
      >
        <span class="settings-menu__icon" aria-hidden="true">{{
          row.icon
        }}</span>
        <span class="settings-menu__text">
          <strong>{{ row.label }}</strong>
          <em>{{ row.summary }}</em>
        </span>
        <span class="settings-menu__chevron" aria-hidden="true">›</span>
      </button>
    </section>
  </div>
</template>
