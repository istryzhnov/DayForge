import { computed, ref, watch } from 'vue'
import { readJson, writeJson } from '../../../lib/storage'
import { TOUR_STEP_BY_ID } from './tourSteps'
import {
  finishTourState,
  freshTourState,
  isTourActive,
  reduceTour,
  sanitizeTourState,
  skipTourState,
  startTourState,
  tourProgress,
  type TourEvent,
  type TourEventPayload,
  type TourState,
} from './tourMachine'
import { useTips } from './useTips'

const TOUR_STORAGE_KEY = 'dayforge-tour-v1'

/**
 * Coach marks on the goals screen that the tour's first steps replace. They
 * count as read once the tour ends, so the same advice is not repeated.
 */
const REPLACED_TIP_IDS = [
  'first-task',
  'add-to-project',
  'nest-tasks',
  // The tour ends on Analytics, so its own tip would pop up right after.
  'analytics-tabs',
]

// Module state, so every part of the app reads the same tour.
const state = ref<TourState | null>(
  sanitizeTourState(readJson<unknown>(TOUR_STORAGE_KEY, null)),
)

/**
 * Whether the bubble is on screen. Closing it with × leaves the tour running;
 * the progress pill brings it back.
 */
const bubbleOpen = ref(true)

watch(
  state,
  (value) => {
    writeJson(TOUR_STORAGE_KEY, value)
  },
  { deep: true },
)

const running = computed(() => isTourActive(state.value))

const currentStep = computed(() => {
  const value = state.value
  if (!isTourActive(value)) return null
  return TOUR_STEP_BY_ID[value.step]
})

const progress = computed(() => {
  const value = state.value
  return isTourActive(value) ? tourProgress(value) : { number: 0, total: 0 }
})

function retireReplacedTips() {
  const { dismiss } = useTips()
  REPLACED_TIP_IDS.forEach((id) => dismiss(id))
}

/**
 * Called by the app when something the user did happens. Only the step that
 * waits for it moves on; the bubble comes back for the step it moves to.
 */
export function tourEvent(event: TourEvent, payload: TourEventPayload = {}) {
  const previous = state.value
  if (!isTourActive(previous)) return
  const next = reduceTour(previous, event, payload)
  if (next === previous) return
  if (next.step !== previous.step) bubbleOpen.value = true
  state.value = next
}

/** Begins the tour at the first step. Does nothing while one is already running. */
export function startTour() {
  const next = startTourState(state.value)
  if (next === state.value) return
  state.value = next
  bubbleOpen.value = true
}

/** Begins again from the first step, whatever was done before. */
function restartTour() {
  state.value = freshTourState()
  bubbleOpen.value = true
}

function skipTour() {
  if (!isTourActive(state.value)) return
  state.value = skipTourState(state.value)
  bubbleOpen.value = false
  retireReplacedTips()
}

function finishTour() {
  if (!isTourActive(state.value)) return
  state.value = finishTourState(state.value)
  bubbleOpen.value = false
  retireReplacedTips()
}

export function useTour() {
  return {
    state: computed<TourState | null>(() => state.value),
    running,
    currentStep,
    stepNumber: computed(() => progress.value.number),
    stepCount: computed(() => progress.value.total),
    bubbleOpen,
    start: startTour,
    restart: restartTour,
    skip: skipTour,
    finish: finishTour,
    close: () => {
      bubbleOpen.value = false
    },
    reopen: () => {
      bubbleOpen.value = true
    },
  }
}
