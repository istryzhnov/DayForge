// Public API of the timer feature: the only entry point other features
// import from. Keep it to what they need; everything else stays internal.
export { default as TaskTimerButton } from './components/TaskTimerButton.vue'
export { default as TimerWidget } from './components/TimerWidget.vue'
export { toggleTaskTimer } from './composables/useTaskTimerButton'
export {
  formatEarned,
  formatRate,
  liveStretchMs,
  sessionEarned,
  taskRate,
} from './composables/timerSubline'
