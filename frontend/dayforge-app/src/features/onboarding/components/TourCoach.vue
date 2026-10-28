<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import type { ID } from '../../../entities/types'
import { useMediaQuery } from '../../../composables/useMediaQuery'
import { useMobileNav } from '../../sidebar/composables/useMobileNav'
import {
  dialogOpen,
  findOnScreen,
  useCoachLayout,
  type CoachTarget,
} from '../composables/useCoachLayout'
import type { TourOffscreen } from '../composables/tourSteps'
import { useTour, tourEvent } from '../composables/useTour'
import { TOUCH_LAYOUT_QUERY } from '../composables/touchLayout'
import CoachBubble from './CoachBubble.vue'

const emit = defineEmits<{
  /** The owner brings the control on screen: the project, the board, or the drawer. */
  (e: 'navigate', target: TourOffscreen, projectId: ID | undefined): void
}>()

const { t } = useI18n()

const {
  state,
  currentStep,
  stepNumber,
  stepCount,
  bubbleOpen,
  running,
  nextChapter,
  skip,
  finish,
  finishAndNext,
  close,
} = useTour()
/** Touch or a phone-width screen: the same cut the phone layout uses. */
const isMobile = useMediaQuery(TOUCH_LAYOUT_QUERY)
const { open: openNav, isOpen: navOpen } = useMobileNav()
const bubble = useTemplateRef<InstanceType<typeof CoachBubble>>('bubble')

/** A dialog covers the page, so the bubble waits underneath it. */
const covered = ref(false)
/** False until the first measure, so a bubble does not flash docked before it finds its control. */
const resolved = ref(false)

/** The step's control, when it can be seen. Null docks the bubble instead. */
function resolve(): CoachTarget | null {
  resolved.value = true
  covered.value = dialogOpen()
  const step = currentStep.value
  const tourState = state.value
  if (!step || !tourState || !bubbleOpen.value || covered.value) return null
  if (!step.anchor) return null
  const selector =
    typeof step.anchor === 'string' ? step.anchor : step.anchor(tourState)
  const el = findOnScreen(selector)
  return el ? { el, placement: step.placement ?? 'bottom' } : null
}

const { target, position, schedule } = useCoachLayout<CoachTarget>(
  resolve,
  () => (bubble.value?.$el as HTMLElement | undefined) ?? null,
)

const visibleStep = computed(() =>
  running.value && bubbleOpen.value && !covered.value
    ? currentStep.value
    : null,
)

/** Docked means no control is on screen right now: the bubble sits at the bottom. */
const docked = computed(
  () => visibleStep.value !== null && resolved.value && target.value === null,
)

/** "Show me" appears only when the control is hidden and the step has somewhere to go. */
const showMeTarget = computed<TourOffscreen | null>(() =>
  docked.value ? (visibleStep.value?.offscreen ?? null) : null,
)

const isFinish = computed(() => visibleStep.value?.doneOn === null)

const bodyText = computed(() => {
  const step = visibleStep.value
  if (!step) return ''
  return isMobile.value && step.touchBodyKey
    ? t(step.touchBodyKey)
    : t(step.bodyKey)
})

function navigate(target: TourOffscreen) {
  emit('navigate', target, state.value?.projectId)
}

/** "Not now" moves the tour to the sidebar timer; the event does the work. */
function decline() {
  const event = visibleStep.value?.branch?.on
  if (event) tourEvent(event)
}

function offer() {
  const target = visibleStep.value?.offer?.target
  if (target) navigate(target)
}

function skipStep() {
  const event = visibleStep.value?.skipOn
  if (event) tourEvent(event)
}

/** An informational step has no action to wait for: its Next button moves on. */
function nextStepClicked() {
  tourEvent('next')
}

// On a phone the sidebar holds the step's control, so the drawer opens for it.
watch(
  () =>
    running.value && bubbleOpen.value && isMobile.value
      ? currentStep.value?.sidebar
        ? currentStep.value.id
        : null
      : null,
  (id) => {
    if (id) openNav()
  },
  { immediate: true },
)

watch([state, bubbleOpen], () => schedule())

// The phone drawer slides in, so its controls are measured again once it has
// settled; measuring at once would find them still off screen.
watch(navOpen, () => {
  schedule()
  window.setTimeout(schedule, 350)
})

/** Esc closes the bubble, not the tour; the progress pill brings it back. */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented) return
  if (!visibleStep.value || dialogOpen()) return
  const focused = event.target as HTMLElement | null
  if (
    focused &&
    (focused.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(focused.tagName))
  ) {
    return
  }
  close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <CoachBubble
      v-if="visibleStep && (docked || position)"
      ref="bubble"
      :title="t(visibleStep.titleKey)"
      :body="bodyText"
      :position="docked ? null : position"
      :close-label="t('onboarding.tourHideStep')"
      @close="close"
    >
      <template #eyebrow>{{
        t('onboarding.tourStepOf', { number: stepNumber, total: stepCount })
      }}</template>
      <template #actions>
        <button
          v-if="showMeTarget"
          class="coach-mark__action"
          type="button"
          @click="navigate(showMeTarget)"
        >
          {{ t('onboarding.tourShowMe') }}
        </button>
        <button
          v-if="visibleStep.offer"
          class="coach-mark__action"
          type="button"
          @click="offer"
        >
          {{ t(visibleStep.offer.labelKey) }}
        </button>
        <button
          v-if="visibleStep.branch"
          class="coach-mark__action"
          type="button"
          @click="decline"
        >
          {{ t('onboarding.tourNotNow') }}
        </button>
        <button
          v-if="visibleStep.skipOn"
          class="coach-mark__action"
          type="button"
          @click="skipStep"
        >
          {{ t('onboarding.tourSkip') }}
        </button>
        <button
          v-if="visibleStep.doneOn === 'next'"
          class="coach-mark__action"
          type="button"
          @click="nextStepClicked"
        >
          {{ t('onboarding.tourNext') }}
        </button>
        <button
          v-if="isFinish && nextChapter"
          class="coach-mark__action"
          type="button"
          @click="finishAndNext"
        >
          {{ t('onboarding.tourNextChapter') }}
        </button>
        <button
          v-if="isFinish"
          class="coach-mark__action"
          type="button"
          @click="finish"
        >
          {{ t('onboarding.tourFinish') }}
        </button>
        <button class="coach-mark__quiet" type="button" @click="skip">
          {{ t('onboarding.tourSkipTour') }}
        </button>
      </template>
    </CoachBubble>
  </Teleport>
</template>
