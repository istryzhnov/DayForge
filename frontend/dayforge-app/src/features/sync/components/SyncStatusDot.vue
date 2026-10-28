<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SyncStatus } from '../../../sync/types'

const { t } = useI18n()

const props = defineProps<{ status: SyncStatus }>()

const emit = defineEmits<{ (e: 'open-account'): void }>()

const needsAttention = computed(
  () => props.status.state === 'offline' || props.status.state === 'error',
)

const label = computed(() =>
  props.status.state === 'error'
    ? t('sync.errorLabel')
    : t('sync.offlineLabel'),
)

const detail = computed(() => {
  if (props.status.state === 'error') {
    return props.status.lastError ?? t('sync.openProfileToLook')
  }
  return t('sync.willUploadLater')
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
