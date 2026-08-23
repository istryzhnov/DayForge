<script setup lang="ts">
import ColorField from './ColorField.vue'
import { useColorTokenGroups } from '../composables/useColorTokenGroups'

const { groups, setColor, resetColor, resetPalette } = useColorTokenGroups()
</script>

<template>
  <div class="settings-section">
    <p class="settings-section__intro">
      Pick any colour by hand. Each field can also suggest companions built from
      the rest of your palette — a complement for the colours that should stand
      apart, a neighbouring hue for the ones that should belong.
    </p>

    <template v-for="group in groups" :key="group.id">
      <p class="sidebar-caption">{{ group.label }}</p>
      <p class="settings-group-hint">{{ group.hint }}</p>
      <ColorField
        v-for="token in group.tokens"
        :key="token.key"
        :label="token.label"
        :description="token.description"
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
      Back to theme colours
    </button>
  </div>
</template>
