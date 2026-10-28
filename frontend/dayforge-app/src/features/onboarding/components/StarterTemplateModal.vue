<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../components/AppIcon.vue'
import {
  FOCUS_OPTIONS,
  LOAD_OPTIONS,
  START_OPTIONS,
  useStarterTemplate,
  type StarterPlan,
} from '../composables/useStarterTemplate'
import { useFocusTrap } from '../../../composables/useFocusTrap'

const emit = defineEmits<{
  (e: 'apply', plan: StarterPlan): void
  (e: 'close'): void
}>()

// Binds to the `ref="trapRef"` root element below.
useFocusTrap({ onEscape: () => emit('close') })

const { t } = useI18n()
const { focus, start, load, plan } = useStarterTemplate()
</script>

<template>
  <div class="starter-overlay" @click.self="emit('close')">
    <div
      ref="trapRef"
      class="starter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="starter-title"
    >
      <header class="starter__head">
        <div>
          <h2 id="starter-title" class="starter__title">
            {{ t('onboarding.starterTitle') }}
          </h2>
          <p class="starter__subtitle">
            {{ t('onboarding.starterSubtitle') }}
          </p>
        </div>
        <button
          class="event-details__close"
          type="button"
          :aria-label="t('onboarding.starterClose')"
          @click="emit('close')"
        >
          <AppIcon name="close" :size="14" />
        </button>
      </header>

      <fieldset class="starter__question">
        <legend class="starter__legend">
          {{ t('onboarding.starterQuestionFocus') }}
        </legend>
        <div class="starter__options">
          <button
            v-for="option in FOCUS_OPTIONS"
            :key="option.value"
            class="starter__option"
            :class="{ 'is-selected': focus === option.value }"
            type="button"
            @click="focus = option.value"
          >
            <strong>{{ t(option.labelKey) }}</strong>
            <span>{{ t(option.hintKey) }}</span>
          </button>
        </div>
      </fieldset>

      <fieldset class="starter__question">
        <legend class="starter__legend">
          {{ t('onboarding.starterQuestionStart') }}
        </legend>
        <div class="starter__options">
          <button
            v-for="option in START_OPTIONS"
            :key="option.value"
            class="starter__option"
            :class="{ 'is-selected': start === option.value }"
            type="button"
            @click="start = option.value"
          >
            <strong>{{ t(option.labelKey) }}</strong>
            <span>{{ t(option.hintKey, option.hintValues) }}</span>
          </button>
        </div>
      </fieldset>

      <fieldset class="starter__question">
        <legend class="starter__legend">
          {{ t('onboarding.starterQuestionLoad') }}
        </legend>
        <div class="starter__options">
          <button
            v-for="option in LOAD_OPTIONS"
            :key="option.value"
            class="starter__option"
            :class="{ 'is-selected': load === option.value }"
            type="button"
            @click="load = option.value"
          >
            <strong>{{ t(option.labelKey) }}</strong>
            <span>{{ t(option.hintKey, option.hintValues) }}</span>
          </button>
        </div>
      </fieldset>

      <!-- Preview so nothing is created blind. -->
      <section class="starter__preview">
        <p class="sidebar-caption">{{ t('onboarding.starterYourDay') }}</p>
        <div class="starter__preview-list">
          <div
            v-for="task in plan.tasks"
            :key="task.title"
            class="starter__preview-row"
          >
            <span class="starter__preview-time">
              {{ task.startTime }}–{{ task.endTime }}
            </span>
            <span>{{ task.title }}</span>
          </div>
        </div>
        <p class="starter__note">
          {{
            t('onboarding.starterNote', {
              goal: plan.goalTitle,
              project: plan.projectTitle,
            })
          }}
        </p>
      </section>

      <div class="starter__actions">
        <button
          class="btn btn-primary"
          type="button"
          @click="emit('apply', plan)"
        >
          {{ t('onboarding.starterCreate') }}
        </button>
        <button class="btn btn-ghost" type="button" @click="emit('close')">
          {{ t('onboarding.starterScratch') }}
        </button>
      </div>
    </div>
  </div>
</template>
