<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { SyncStatus } from '../../../sync/types'

const props = defineProps<{ status: SyncStatus }>()

const emit = defineEmits<{ (e: 'open-account'): void }>()

/**
 * A push that lands in a few hundred milliseconds should not make anything
 * flicker, so the working state only shows itself once it has lasted a moment.
 */
const SHOW_WORKING_AFTER_MS = 1000

const workingLongEnough = ref(false)
let delayId: number | undefined

function clearDelay() {
  if (delayId === undefined) return
  window.clearTimeout(delayId)
  delayId = undefined
}

watch(
  () => props.status.state,
  (state) => {
    clearDelay()
    if (state !== 'syncing') {
      workingLongEnough.value = false
      return
    }
    delayId = window.setTimeout(() => {
      workingLongEnough.value = true
      delayId = undefined
    }, SHOW_WORKING_AFTER_MS)
  },
  { immediate: true },
)

onUnmounted(clearDelay)

/** Nothing to say is said with nothing: no account, or everything is through. */
const isSilent = computed(() => {
  const { state } = props.status
  if (state === 'off') return true
  if (state === 'idle') return true
  return state === 'syncing' && !workingLongEnough.value
})

const label = computed(() => {
  const { state, queued, deadLettered } = props.status

  if (state === 'error') {
    return deadLettered === 1
      ? 'One change was refused'
      : `${deadLettered} changes were refused`
  }
  if (state === 'offline') {
    if (queued === 0) return 'Offline'
    return queued === 1
      ? 'Offline — 1 change saved here'
      : `Offline — ${queued} changes saved here`
  }
  return 'Saving…'
})

const detail = computed(() => {
  if (props.status.state === 'error') {
    return props.status.lastError ?? 'Open your profile to look.'
  }
  if (props.status.state === 'offline') {
    return 'They will go up on their own once there is a connection.'
  }
  return null
})

const isActionable = computed(() => props.status.state === 'error')
</script>

<template>
  <div v-if="!isSilent" class="sync-status" :class="`is-${status.state}`">
    <component
      :is="isActionable ? 'button' : 'div'"
      class="sync-status__body"
      :type="isActionable ? 'button' : undefined"
      :title="detail ?? label"
      @click="isActionable ? emit('open-account') : undefined"
    >
      <span class="sync-status__dot" aria-hidden="true"></span>
      <span class="sync-status__label">{{ label }}</span>
      <span
        v-if="status.state === 'offline' && status.queued > 0"
        class="sync-status__count"
        >{{ status.queued }}</span
      >
    </component>
  </div>
</template>
