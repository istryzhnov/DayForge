<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ColorField from './ColorField.vue'
import { useColorTokenGroups } from '../composables/useColorTokenGroups'

const { t } = useI18n()

const { groups, setColor, resetColor, resetPalette } = useColorTokenGroups()
</script>

<template>
  <div class="settings-section">
    <p class="settings-section__intro">
      {{ t('settings.colourIntro') }}
    </p>

    <template v-for="group in groups" :key="group.id">
      <p class="sidebar-caption">{{ t(group.labelKey) }}</p>
      <p class="settings-group-hint">{{ t(group.hintKey) }}</p>
      <ColorField
        v-for="token in group.tokens"
        :key="token.key"
        :label="t(token.labelKey)"
        :description="t(token.descriptionKey)"
        :value="token.value"
        :is-custom="token.isCustom"
        :suggestions="token.suggestions"
        :contrast-message="token.contrastMessage"
        :contrast-level="token.contrastLevel"
        @update="(color) => setColor(token.key, color)"
        @reset="() => resetColor(token.key)"
      />
    </template>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetPalette"
    >
      {{ t('settings.colourBackToTheme') }}
    </button>
  </div>
</template>
