<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../shared/ui/AppIcon.vue'
import type { AppIconName } from '../../../shared/ui/appIconPaths'
import { useModules } from '../../../shared/composables/useModules'
import {
  MODULE_GROUPS,
  MODULE_NEEDS,
  type ModuleId,
  type ModulePreset,
} from '../../../shared/composables/moduleCatalog'

/**
 * "Збери свій DayForge": quick-start sets, the module switches by group, and
 * a preview of the menu the current choice leaves on the phone.
 */
const { t } = useI18n()
const {
  isOn,
  setModule,
  applyPreset,
  onCount,
  allCount,
  activePreset,
  presets,
} = useModules()

const ICON: Record<ModuleId, AppIconName> = {
  notes: 'mod-notes',
  subtasks: 'mod-subtasks',
  reminders: 'mod-reminders',
  board: 'mod-board',
  calendar: 'mod-calendar',
  timer: 'mod-timer',
  habits: 'mod-habits',
  earnings: 'mod-earnings',
  clients: 'mod-clients',
  analytics: 'mod-analytics',
}

const PRESET_LABEL: Record<ModulePreset['id'], [string, string]> = {
  simple: ['modules.presetSimple', 'modules.presetSimpleHint'],
  study: ['modules.presetStudy', 'modules.presetStudyHint'],
  freelance: ['modules.presetFreelance', 'modules.presetFreelanceHint'],
}

const GROUP_LABEL = {
  tasks: 'modules.groupTasks',
  time: 'modules.groupTime',
  money: 'modules.groupMoney',
} as const

const groups = computed(() =>
  MODULE_GROUPS.map((group) => ({
    id: group.id,
    label: t(GROUP_LABEL[group.id]),
    tag: group.id === 'money' ? t('modules.groupMoneyTag') : null,
    rows: group.modules.map((id, index) => {
      const need = MODULE_NEEDS[id]
      const blocked = need !== undefined && !isOn(need)
      return {
        id,
        index,
        name: t(`modules.name_${id}`),
        desc: blocked ? t('modules.clientsNeeds') : t(`modules.desc_${id}`),
        icon: ICON[id],
        on: isOn(id),
        blocked,
      }
    }),
  })),
)

/** Tabs the phone bar shows for the current switches, in its order. */
const previewTabs = computed(() => {
  const left: { icon: AppIconName; label: string }[] = [
    { icon: 'check-square', label: t('sidebar.projects') },
  ]
  if (isOn('calendar'))
    left.push({ icon: 'calendar', label: t('sidebar.calendar') })
  const right: { icon: AppIconName; label: string }[] = []
  if (isOn('analytics'))
    right.push({ icon: 'chart', label: t('sidebar.analytics') })
  if (isOn('timer')) right.push({ icon: 'timer', label: t('sidebar.timer') })
  return { left, right }
})

function toggle(id: ModuleId, blocked: boolean) {
  if (blocked) return
  setModule(id, !isOn(id))
}
</script>

<template>
  <div class="settings-section modules-screen">
    <div class="modules-screen__presets">
      <p class="ui-section-label">{{ t('modules.presetsLabel') }}</p>
      <div
        class="modules-screen__preset-grid"
        role="radiogroup"
        :aria-label="t('modules.presetsGroup')"
      >
        <button
          v-for="preset in presets"
          :key="preset.id"
          type="button"
          role="radio"
          class="modules-screen__preset"
          :class="{ 'is-chosen': activePreset === preset.id }"
          :aria-checked="activePreset === preset.id"
          @click="applyPreset(preset)"
        >
          <span class="modules-screen__preset-name">{{
            t(PRESET_LABEL[preset.id][0])
          }}</span>
          <span class="modules-screen__preset-hint">{{
            t(PRESET_LABEL[preset.id][1])
          }}</span>
        </button>
      </div>
    </div>

    <section
      v-for="group in groups"
      :key="group.id"
      class="modules-screen__group"
      :aria-label="group.label"
    >
      <p class="ui-section-label modules-screen__group-label">
        {{ group.label }}
        <span v-if="group.tag" class="modules-screen__tag">{{
          group.tag
        }}</span>
      </p>

      <div class="modules-screen__list">
        <div
          v-for="row in group.rows"
          :key="row.id"
          class="modules-screen__row"
          :class="{ 'is-blocked': row.blocked, 'is-first': row.index === 0 }"
        >
          <span
            class="modules-screen__icon"
            :class="{ 'is-on': row.on }"
            aria-hidden="true"
          >
            <AppIcon :name="row.icon" :size="19" />
          </span>
          <span class="modules-screen__text">
            <strong>{{ row.name }}</strong>
            <em>{{ row.desc }}</em>
          </span>
          <button
            type="button"
            role="switch"
            class="modules-screen__switch"
            :class="{ 'is-on': row.on }"
            :aria-checked="row.on"
            :aria-label="row.name"
            :aria-disabled="row.blocked"
            :disabled="row.blocked"
            @click="toggle(row.id, row.blocked)"
          >
            <span class="modules-screen__knob" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </section>

    <div class="modules-screen__preview">
      <p class="modules-screen__counter" aria-live="polite">
        <span>{{ t('modules.preview') }}</span>
        <span class="modules-screen__count">{{
          t('modules.count', { on: onCount, all: allCount })
        }}</span>
      </p>
      <nav class="modules-screen__bar" :aria-label="t('modules.preview')">
        <span
          v-for="tab in previewTabs.left"
          :key="tab.label"
          class="modules-screen__tab"
          :title="tab.label"
        >
          <AppIcon :name="tab.icon" :size="22" />
          <span class="modules-screen__sr">{{ tab.label }}</span>
        </span>
        <span
          class="modules-screen__tab modules-screen__tab--add"
          :title="t('sidebar.quickAddTask')"
        >
          <AppIcon name="plus" :size="24" />
          <span class="modules-screen__sr">{{
            t('sidebar.quickAddTask')
          }}</span>
        </span>
        <span
          v-for="tab in previewTabs.right"
          :key="tab.label"
          class="modules-screen__tab"
          :title="tab.label"
        >
          <AppIcon :name="tab.icon" :size="22" />
          <span class="modules-screen__sr">{{ tab.label }}</span>
        </span>
      </nav>
    </div>
  </div>
</template>
