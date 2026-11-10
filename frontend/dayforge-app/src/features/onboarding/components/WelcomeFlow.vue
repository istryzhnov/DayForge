<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../components/AppIcon.vue'
import type { AppIconName } from '../../../components/appIconPaths'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import type { StartView } from '../../../composables/useSettings'
import { GOAL_COLOR_PRESETS } from '../../../entities/constants'
import {
  USE_OPTIONS,
  useWelcome,
  type AccountChoice,
  type UseChoice,
  type WelcomeStep,
} from '../composables/useWelcome'
import {
  taskTimeRange,
  type WelcomeTemplateId,
} from '../composables/welcomeTemplates'
import WelcomeOption from './WelcomeOption.vue'

const emit = defineEmits<{
  (e: 'select-view', view: StartView): void
  (
    e: 'create-project',
    title: string,
    color: string,
    select: boolean,
    templateId: WelcomeTemplateId | null,
  ): void
}>()

const { t } = useI18n()

/** Mounted only while the card is open, so the trap is live exactly then. */
const flow = useWelcome({
  selectView: (view) => emit('select-view', view),
  createProject: (title, color, select, templateId) =>
    emit('create-project', title, color, select, templateId),
})

const {
  step,
  account,
  useChoice,
  projectName,
  projectColor,
  startMode,
  templateId,
  templates,
  template,
  templateName,
  canContinue,
  canCreate,
  error,
  isBusy,
  continueStep,
  back,
  skip,
  createProject,
  dismissError,
} = flow

// Esc skips the whole flow, the same as the quiet Skip link.
useFocusTrap({ onEscape: () => skip() })

const STEP_COPY: Record<
  WelcomeStep,
  { icon: AppIconName; titleKey: string; subtitleKey: string }
> = {
  1: {
    icon: 'globe',
    titleKey: 'onboarding.welcomeStep1Title',
    subtitleKey: 'onboarding.welcomeStep1Subtitle',
  },
  2: {
    icon: 'target',
    titleKey: 'onboarding.welcomeStep2Title',
    subtitleKey: 'onboarding.welcomeStep2Subtitle',
  },
  3: {
    icon: 'plus',
    titleKey: 'onboarding.welcomeStep3Title',
    subtitleKey: 'onboarding.welcomeStep3Subtitle',
  },
}

const ACCOUNT_OPTIONS: ReadonlyArray<{
  value: AccountChoice
  icon: AppIconName
  labelKey: string
  descriptionKey: string
}> = [
  {
    value: 'signin',
    icon: 'users',
    labelKey: 'onboarding.welcomeAccountSignin',
    descriptionKey: 'onboarding.welcomeAccountSigninHint',
  },
  {
    value: 'signup',
    icon: 'plus',
    labelKey: 'onboarding.welcomeAccountSignup',
    descriptionKey: 'onboarding.welcomeAccountSignupHint',
  },
  {
    value: 'local',
    icon: 'save',
    labelKey: 'onboarding.welcomeAccountLocal',
    descriptionKey: 'onboarding.welcomeAccountLocalHint',
  },
]

/** The same colour names as the new-project form (sidebar), in the same order as the presets. */
const COLOR_NAME_KEYS = [
  'sidebar.colourOrange',
  'sidebar.colourLime',
  'sidebar.colourCyan',
  'sidebar.colourYellow',
  'sidebar.colourPink',
  'sidebar.colourViolet',
]
const SWATCHES = GOAL_COLOR_PRESETS.map((value, index) => ({
  value,
  nameKey: COLOR_NAME_KEYS[index],
}))

function pickAccount(value: AccountChoice) {
  account.value = value
  dismissError()
}

function pickUse(value: UseChoice) {
  useChoice.value = value
}
</script>

<template>
  <Teleport to="body">
    <div class="welcome-overlay">
      <div
        ref="trapRef"
        class="welcome"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-subtitle"
      >
        <div
          class="welcome__progress"
          role="img"
          :aria-label="t('onboarding.welcomeProgress', { step })"
        >
          <span
            v-for="n in 3"
            :key="n"
            class="welcome__bar"
            :class="{ 'is-current': n === step, 'is-done': n < step }"
          ></span>
        </div>

        <div class="welcome__badge" aria-hidden="true">
          <AppIcon :name="STEP_COPY[step].icon" :size="22" />
        </div>

        <header class="welcome__head">
          <h2 id="welcome-title" class="welcome__title">
            {{ t(STEP_COPY[step].titleKey) }}
          </h2>
          <p id="welcome-subtitle" class="welcome__subtitle">
            {{ t(STEP_COPY[step].subtitleKey) }}
          </p>
        </header>

        <!-- All three steps stay in one grid cell, so the body is as tall as the
             tallest step and the footer never moves between steps. -->
        <div class="welcome__body">
          <div
            class="welcome__options welcome__step"
            :class="{ 'is-current': step === 1 }"
            role="group"
            :aria-label="t('onboarding.welcomeAccountGroup')"
          >
            <WelcomeOption
              v-for="option in ACCOUNT_OPTIONS"
              :key="option.value"
              :icon="option.icon"
              :label="t(option.labelKey)"
              :description="t(option.descriptionKey)"
              :selected="account === option.value"
              :disabled="isBusy"
              @select="pickAccount(option.value)"
            />
          </div>

          <div
            class="welcome__options welcome__step"
            :class="{ 'is-current': step === 2 }"
            role="group"
            :aria-label="t('onboarding.welcomeUseGroup')"
          >
            <WelcomeOption
              v-for="option in USE_OPTIONS"
              :key="option.value"
              :icon="option.icon"
              :label="t(option.labelKey)"
              :description="t(option.hintKey)"
              :selected="useChoice === option.value"
              @select="pickUse(option.value)"
            />
          </div>

          <form
            class="welcome__project welcome__step"
            :class="{ 'is-current': step === 3 }"
            @submit.prevent="createProject"
          >
            <div
              class="ui-tabs"
              role="group"
              :aria-label="t('onboarding.welcomeModeGroup')"
            >
              <button
                class="ui-tab"
                :class="{ 'is-active': startMode === 'blank' }"
                type="button"
                :aria-pressed="startMode === 'blank'"
                @click="startMode = 'blank'"
              >
                {{ t('onboarding.welcomeModeBlank') }}
              </button>
              <button
                class="ui-tab"
                :class="{ 'is-active': startMode === 'template' }"
                type="button"
                :aria-pressed="startMode === 'template'"
                @click="startMode = 'template'"
              >
                {{ t('onboarding.welcomeModeTemplate') }}
              </button>
            </div>

            <template v-if="startMode === 'template'">
              <div
                class="welcome-templates"
                role="group"
                :aria-label="t('onboarding.welcomeTemplateGroup')"
              >
                <button
                  v-for="item in templates"
                  :key="item.id"
                  class="welcome-template"
                  type="button"
                  :aria-pressed="templateId === item.id"
                  @click="templateId = item.id"
                >
                  <span class="welcome-template__icon" aria-hidden="true">
                    <AppIcon :name="item.icon" :size="16" />
                  </span>
                  <span class="welcome-template__name">{{
                    t(item.nameKey)
                  }}</span>
                  <span class="welcome-template__hint">{{
                    t(item.hintKey)
                  }}</span>
                </button>
              </div>

              <ul
                class="welcome-template-preview"
                :aria-label="t('onboarding.welcomeTemplatePreview')"
              >
                <li v-for="task in template.tasks" :key="task.titleKey">
                  <span class="welcome-template-preview__dot"></span>
                  <span class="welcome-template-preview__title">{{
                    t(task.titleKey)
                  }}</span>
                  <span
                    v-if="taskTimeRange(task) || task.daily"
                    class="welcome-template-preview__meta"
                  >
                    {{ taskTimeRange(task) ?? t('onboarding.templateDaily') }}
                  </span>
                </li>
                <li
                  v-if="template.hourlyRate"
                  class="welcome-template-preview__note"
                >
                  {{
                    t('onboarding.templateRateNote', {
                      rate: template.hourlyRate,
                    })
                  }}
                </li>
              </ul>
            </template>

            <label class="welcome__label" for="welcome-project-name">{{
              t('onboarding.welcomeProjectName')
            }}</label>
            <input
              id="welcome-project-name"
              v-model="projectName"
              class="welcome__input"
              type="text"
              :placeholder="
                startMode === 'template'
                  ? templateName
                  : t('onboarding.welcomeProjectPlaceholder')
              "
              autocomplete="off"
            />
            <div
              class="new-goal-colors"
              role="group"
              :aria-label="t('onboarding.welcomeColourGroup')"
            >
              <button
                v-for="swatch in SWATCHES"
                :key="swatch.value"
                class="new-goal-swatch"
                :class="{ active: projectColor === swatch.value }"
                type="button"
                :style="{ backgroundColor: swatch.value }"
                :aria-label="t(swatch.nameKey)"
                :aria-pressed="projectColor === swatch.value"
                @click="projectColor = swatch.value"
              ></button>
            </div>
          </form>
        </div>

        <!-- Always rendered, so an error appearing does not push the footer down. -->
        <p class="welcome__error" role="alert">{{ error }}</p>

        <footer class="welcome__footer">
          <button
            v-if="step > 1"
            class="btn btn-ghost"
            type="button"
            @click="back"
          >
            {{ t('onboarding.welcomeBack') }}
          </button>

          <div class="welcome__actions">
            <button
              v-if="step === 3"
              class="btn btn-primary"
              type="button"
              :disabled="!canCreate"
              @click="createProject"
            >
              {{ t('onboarding.welcomeCreateProject') }}
            </button>
            <button
              v-else
              class="btn btn-primary"
              type="button"
              :disabled="!canContinue || isBusy"
              @click="continueStep"
            >
              {{ t('onboarding.welcomeContinue') }}
            </button>
          </div>
        </footer>

        <button class="welcome__skip" type="button" @click="skip">
          {{ t('onboarding.welcomeSkip') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
