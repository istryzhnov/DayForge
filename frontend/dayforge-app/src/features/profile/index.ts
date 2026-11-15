// Public API of the profile feature: the only entry point other features
// import from. Keep it to what they need; everything else stays internal.
export { default as DeleteAccountDialog } from './components/DeleteAccountDialog.vue'
export { default as ProfileAvatar } from './components/ProfileAvatar.vue'
export { default as SidebarProfileButton } from './components/SidebarProfileButton.vue'
export { useProfile } from './composables/useProfile'
export { useProfilePanel } from './composables/useProfilePanel'
