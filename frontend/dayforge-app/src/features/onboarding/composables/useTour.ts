import { computed, ref, watch } from 'vue'
import { readJson, writeJson } from '../../../lib/storage'
import {
  TOUR_CHAPTERS,
  TOUR_CHAPTER_BY_ID,
  TOUR_STEP_BY_ID,
  type ChapterId,
} from './tourSteps'
import {
  finishTourState,
  freshTourState,
  isTourActive,
  reduceTour,
  sanitizeTourStore,
  skipTourState,
  startTourState,
  tourProgress,
  type TourEvent,
  type TourEventPayload,
  type TourState,
  type TourStore,
} from './tourMachine'
import { isTouchLayout } from './touchLayout'
import { useTips } from './useTips'

/** The same key as before chapters; the value now holds the run and the finished chapters. */
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

const saved = sanitizeTourStore(readJson<unknown>(TOUR_STORAGE_KEY, null))

// Module state, so every part of the app reads the same tour.
const state = ref<TourState | null>(saved.run)
const completed = ref<ChapterId[]>(saved.completed)

/**
 * Whether the bubble is on screen. Closing it with × leaves the tour running;
 * the progress pill brings it back.
 */
const bubbleOpen = ref(true)

watch(
  [state, completed],
  ([run, done]) => {
    const store: TourStore = { run, completed: done }
    writeJson(TOUR_STORAGE_KEY, store)
  },
  { deep: true },
)

const running = computed(() => isTourActive(state.value))

const currentStep = computed(() => {
  const value = state.value
  if (!isTourActive(value)) return null
  return TOUR_STEP_BY_ID[value.step]
})

const chapter = computed<ChapterId | null>(() =>
  isTourActive(state.value) ? state.value.chapter : null,
)

const progress = computed(() => {
  const value = state.value
  return isTourActive(value) ? tourProgress(value) : { number: 0, total: 0 }
})

/** The chapter after the running one, in list order; null after the last. */
const nextChapter = computed<ChapterId | null>(() => {
  const current = chapter.value
  if (!current) return null
  const index = TOUR_CHAPTERS.findIndex((item) => item.id === current)
  return TOUR_CHAPTERS[index + 1]?.id ?? null
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

/** Begins Basics at the first step. Does nothing while a tour is already running. */
export function startTour() {
  const next = startTourState(state.value)
  if (next === state.value) return
  state.value = next
  bubbleOpen.value = true
}

/** Begins a chapter at its first step, whatever was done before. */
function startChapter(id: ChapterId) {
  state.value = freshTourState(id, isTouchLayout())
  bubbleOpen.value = true
}

function skipTour() {
  if (!isTourActive(state.value)) return
  state.value = skipTourState(state.value)
  bubbleOpen.value = false
  retireReplacedTips()
}

/** Ends the running chapter and records it as completed. */
function finishTour() {
  const value = state.value
  if (!isTourActive(value)) return
  state.value = finishTourState(value)
  if (!completed.value.includes(value.chapter)) {
    completed.value = [...completed.value, value.chapter]
  }
  bubbleOpen.value = false
  retireReplacedTips()
}

/** "Next chapter": completes this one and starts the following one. */
function finishAndNext() {
  const following = nextChapter.value
  finishTour()
  if (following) startChapter(following)
}

export function useTour() {
  return {
    state: computed<TourState | null>(() => state.value),
    running,
    chapter,
    currentStep,
    chapterTitleKey: computed(() =>
      chapter.value ? TOUR_CHAPTER_BY_ID[chapter.value].titleKey : '',
    ),
    stepNumber: computed(() => progress.value.number),
    stepCount: computed(() => progress.value.total),
    nextChapter,
    completed,
    bubbleOpen,
    start: startTour,
    startChapter,
    /** Starts Basics again, whatever was done before. */
    restart: () => startChapter('basics'),
    skip: skipTour,
    finish: finishTour,
    finishAndNext,
    close: () => {
      bubbleOpen.value = false
    },
    reopen: () => {
      bubbleOpen.value = true
    },
  }
}
