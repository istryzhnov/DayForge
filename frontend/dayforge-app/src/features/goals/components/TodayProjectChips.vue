<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'

defineProps<{
  projects: Goal[]
  colors: Map<string, string>
  /** Rows across every project; shown on the "all" chip. */
  total: number
  selectedId: ID | null
}>()

const emit = defineEmits<{
  (e: 'select', goalId: ID | null): void
}>()

const { t } = useI18n()
</script>

<template>
  <div class="today-chips" role="group" :aria-label="t('today.filterAria')">
    <button
      type="button"
      class="ui-chip today-chips__chip"
      :class="{ 'is-active': selectedId === null }"
      :aria-pressed="selectedId === null"
      @click="emit('select', null)"
    >
      {{ t('today.allCount', { n: total }) }}
    </button>
    <button
      v-for="project in projects"
      :key="project.id"
      type="button"
      class="ui-chip today-chips__chip"
      :class="{ 'is-active': selectedId === project.id }"
      :aria-pressed="selectedId === project.id"
      @click="emit('select', project.id)"
    >
      <span
        class="today-chips__dot"
        :style="{ background: colors.get(project.id) }"
        aria-hidden="true"
      />
      {{ project.title }}
    </button>
  </div>
</template>
