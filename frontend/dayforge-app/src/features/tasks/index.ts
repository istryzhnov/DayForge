// Public API of the tasks feature: the only entry point other features
// import from. Keep it to what they need; everything else stays internal.
export { default as TaskComposer } from './components/TaskComposer.vue'
export { default as TaskInlineEditor } from './components/TaskInlineEditor.vue'
export { default as TaskList } from './components/TaskList.vue'
export { default as TaskMoveDialog } from './components/TaskMoveDialog.vue'
export { default as TaskNotesButton } from './components/TaskNotesButton.vue'
export { default as TaskScheduleFields } from './components/TaskScheduleFields.vue'
export { default as UpcomingTasks } from './components/UpcomingTasks.vue'
export { goalDropState } from './composables/taskDropTarget'
export { useTaskActions } from './composables/useTaskActions'
export {
  UPCOMING_WINDOW_DAYS,
  collectUpcoming,
} from './composables/useUpcomingTasks'
