<script setup lang="ts">
import { LOCALE_OPTIONS, useSettings } from '../../../composables/useSettings'
import type { LocaleId } from '../../../composables/useSettings'
import { CLOCK_OPTIONS } from '../composables/settingsOptions'
import { textValue } from '../../../composables/inputValue'

const { settings, update, resetSection } = useSettings()
</script>

<template>
  <div class="settings-section">
    <p class="settings-section__intro">
      Formatting only — the interface text itself is still English.
    </p>

    <label class="settings-select">
      <span>Date language</span>
      <select
        :value="settings.format.locale"
        @change="update('format', { locale: textValue($event) as LocaleId })"
      >
        <option
          v-for="option in LOCALE_OPTIONS"
          :key="option.id"
          :value="option.id"
        >
          {{ option.label }}
        </option>
      </select>
    </label>

    <p class="sidebar-caption">Clock</p>
    <div class="settings-chips">
      <button
        v-for="option in CLOCK_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: settings.format.clock === option.id }"
        type="button"
        @click="update('format', { clock: option.id })"
      >
        {{ option.label }}
      </button>
    </div>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetSection('format')"
    >
      Reset formats
    </button>
  </div>
</template>
