<script setup lang="ts">
import { computed } from 'vue'
import type { SyncStatus } from '../../../sync/types'

const props = defineProps<{ status: SyncStatus }>()

const emit = defineEmits<{ (e: 'open-account'): void }>()

const needsAttention = computed(
  () => props.status.state === 'offline' || props.status.state === 'error',
)

const label = computed(() =>
  props.status.state === 'error' ? 'Sync error' : 'Offline',
)

const detail = computed(() => {
  if (props.status.state === 'error') {
    return props.status.lastError ?? 'Open your profile to look.'
  }
  return 'They will go up on their own once there is a connection.'
})

const isActionable = computed(() => props.status.state === 'error')
</script>

<template>
  <div v-if="needsAttention" class="sync-status" :class="`is-${status.state}`">
    <component
      :is="isActionable ? 'button' : 'div'"
      class="sync-status__body"
      :type="isActionable ? 'button' : undefined"
      :title="detail"
      @click="isActionable ? emit('open-account') : undefined"
    >
      <span class="sync-status__label">{{ label }}</span>
    </component>
  </div>
</template>
