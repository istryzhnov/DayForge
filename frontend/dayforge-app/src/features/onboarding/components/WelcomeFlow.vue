<script setup lang="ts">
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
import WelcomeOption from './WelcomeOption.vue'

const emit = defineEmits<{
  (e: 'select-view', view: StartView): void
  (e: 'create-project', title: string, color: string, select: boolean): void
  (e: 'use-template'): void
}>()

/** Mounted only while the card is open, so the trap is live exactly then. */
const flow = useWelcome({
  selectView: (view) => emit('select-view', view),
  createProject: (title, color, select) =>
    emit('create-project', title, color, select),
  useTemplate: () => emit('use-template'),
})

const {
  step,
  account,
  useChoice,
  projectName,
  projectColor,
  canContinue,
  canCreate,
  error,
  isBusy,
  continueStep,
  back,
  skip,
  createProject,
  useTemplate,
  dismissError,
} = flow

// Esc skips the whole flow, the same as the quiet Skip link.
useFocusTrap({ onEscape: () => skip() })

const STEP_COPY: Record<
  WelcomeStep,
  { icon: AppIconName; title: string; subtitle: string }
> = {
  1: {
    icon: 'globe',
    title: 'Welcome to DayForge',
    subtitle: 'Plan your day, track your time, keep it all in sync.',
  },
  2: {
    icon: 'target',
    title: 'What will you mainly use DayForge for?',
    subtitle: "We'll set things up to match.",
  },
  3: {
    icon: 'plus',
    title: 'Start your first project',
    subtitle: 'Give it a name, or start from a template.',
  },
}

const ACCOUNT_OPTIONS: ReadonlyArray<{
  value: AccountChoice
  icon: AppIconName
  label: string
  description: string
}> = [
  {
    value: 'signin',
    icon: 'users',
    label: 'I have an account',
    description: 'Sign in with Google and pick up where you left off.',
  },
  {
    value: 'signup',
    icon: 'plus',
    label: 'Create an account',
    description: 'Sign up with Google to sync across devices.',
  },
  {
    value: 'local',
    icon: 'save',
    label: 'Continue without an account',
    description: 'Everything stays in this browser. You can sign in later.',
  },
]

/** Same names as the new-project form, in the same order as the presets. */
const COLOR_NAMES = ['Lime', 'Orange', 'Cyan', 'Yellow', 'Pink', 'Violet']
const SWATCHES = GOAL_COLOR_PRESETS.map((value, index) => ({
  value,
  name: COLOR_NAMES[index],
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
          :aria-label="`Step ${step} of 3`"
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
            {{ STEP_COPY[step].title }}
          </h2>
          <p id="welcome-subtitle" class="welcome__subtitle">
            {{ STEP_COPY[step].subtitle }}
          </p>
        </header>

        <!-- All three steps stay in one grid cell, so the body is as tall as the
             tallest step and the footer never moves between steps. -->
        <div class="welcome__body">
          <div
            class="welcome__options welcome__step"
            :class="{ 'is-current': step === 1 }"
            role="group"
            aria-label="Account"
          >
            <WelcomeOption
              v-for="option in ACCOUNT_OPTIONS"
              :key="option.value"
              :icon="option.icon"
              :label="option.label"
              :description="option.description"
              :selected="account === option.value"
              :disabled="isBusy"
              @select="pickAccount(option.value)"
            />
          </div>

          <div
            class="welcome__options welcome__step"
            :class="{ 'is-current': step === 2 }"
            role="group"
            aria-label="Main use"
          >
            <WelcomeOption
              v-for="option in USE_OPTIONS"
              :key="option.value"
              :icon="option.icon"
              :label="option.label"
              :description="option.hint"
              :selected="useChoice === option.value"
              @select="pickUse(option.value)"
            />
          </div>

          <form
            class="welcome__project welcome__step"
            :class="{ 'is-current': step === 3 }"
            @submit.prevent="createProject"
          >
            <label class="welcome__label" for="welcome-project-name"
              >Project name</label
            >
            <input
              id="welcome-project-name"
              v-model="projectName"
              class="welcome__input"
              type="text"
              placeholder="For example, Website redesign"
              autocomplete="off"
            />
            <div
              class="new-goal-colors"
              role="group"
              aria-label="Project colour"
            >
              <button
                v-for="swatch in SWATCHES"
                :key="swatch.value"
                class="new-goal-swatch"
                :class="{ active: projectColor === swatch.value }"
                type="button"
                :style="{ backgroundColor: swatch.value }"
                :aria-label="swatch.name"
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
            Back
          </button>

          <div class="welcome__actions">
            <button
              v-if="step === 3"
              class="btn btn-ghost"
              type="button"
              @click="useTemplate"
            >
              Use a template
            </button>
            <button
              v-if="step === 3"
              class="btn btn-primary"
              type="button"
              :disabled="!canCreate"
              @click="createProject"
            >
              Create project
            </button>
            <button
              v-else
              class="btn btn-primary"
              type="button"
              :disabled="!canContinue || isBusy"
              @click="continueStep"
            >
              Continue
            </button>
          </div>
        </footer>

        <button class="welcome__skip" type="button" @click="skip">Skip</button>
      </div>
    </div>
  </Teleport>
</template>
