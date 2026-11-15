// Public API of the onboarding feature: the only entry point other features
// import from. Keep it to what they need; everything else stays internal.
export { default as TourChapterList } from './components/TourChapterList.vue'
export { default as TourPill } from './components/TourPill.vue'
export { COACH_TIPS_ENABLED } from './composables/tips'
export { TOUCH_LAYOUT_QUERY } from './composables/touchLayout'
export { TOUR_CHAPTERS } from './composables/tourSteps'
export { useTips } from './composables/useTips'
export { useTour } from './composables/useTour'
