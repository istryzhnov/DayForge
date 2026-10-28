<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  DATE_LOCALE_BY_LANGUAGE,
  LOCALE_OPTIONS,
  useSettings,
  type LocaleId,
} from '../../../composables/useSettings'
import type { Language } from '../../../i18n/languages'
import { CLOCK_OPTIONS, LANGUAGE_OPTIONS } from '../composables/settingsOptions'
import { textValue } from '../../../composables/inputValue'

const { t } = useI18n()
const { settings, update, resetSection } = useSettings()

/** The date format follows the language, but can still be changed after. */
function chooseLanguage(language: Language) {
  update('format', {
    language,
    locale: DATE_LOCALE_BY_LANGUAGE[language],
  })
}
</script>

<template>
  <div class="settings-section">
    <label class="settings-select">
      <span>{{ t('settings.languageLabel') }}</span>
      <select
        :value="settings.format.language"
        @change="chooseLanguage(textValue($event) as Language)"
      >
        <option
          v-for="option in LANGUAGE_OPTIONS"
          :key="option.id"
          :value="option.id"
        >
          {{ option.label }}
        </option>
      </select>
    </label>

    <label class="settings-select">
      <span>{{ t('settings.dateFormatLabel') }}</span>
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

    <p class="ui-section-label ui-section-label--wrap">
      {{ t('settings.clockCaption') }}
    </p>
    <div class="ui-chips">
      <button
        v-for="option in CLOCK_OPTIONS"
        :key="option.id"
        class="ui-chip ui-chip--wrap"
        :class="{ 'is-active': settings.format.clock === option.id }"
        type="button"
        @click="update('format', { clock: option.id })"
      >
        {{ t(option.labelKey) }}
      </button>
    </div>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetSection('format')"
    >
      {{ t('settings.resetFormats') }}
    </button>
  </div>
</template>
