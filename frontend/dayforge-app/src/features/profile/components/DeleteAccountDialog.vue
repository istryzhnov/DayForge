<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import { useAccountDeletion } from '../composables/useAccountDeletion'
import {
  DELETE_CONFIRMATION,
  isDeleteConfirmed,
} from '../../../sync/accountDeletion'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'export-backup'): void
}>()

const { isBusy, error, isOnline, offlineHint, deleteAccount } =
  useAccountDeletion()

const { t } = useI18n()

const typed = ref('')
const confirmed = computed(() => isDeleteConfirmed(typed.value))
const canConfirm = computed(
  () => confirmed.value && isOnline.value && !isBusy.value,
)

function close() {
  // Closing mid-delete would hide the outcome of a request already in flight.
  if (!isBusy.value) emit('close')
}

useFocusTrap({ onEscape: close })

async function confirm() {
  if (!canConfirm.value) return
  await deleteAccount()
}
</script>

<template>
  <Teleport to="body">
    <section class="account-delete">
      <div class="modal-overlay" @click="close"></div>
      <div
        ref="trapRef"
        class="modal-card account-delete__card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="account-delete-title"
        aria-describedby="account-delete-body"
      >
        <h3 id="account-delete-title">{{ t('profile.deleteDialogTitle') }}</h3>

        <p id="account-delete-body" class="settings-group-hint">
          {{ t('profile.deleteDialogBody') }}
        </p>
        <p class="settings-group-hint">
          {{ t('profile.deleteDialogDevice') }}
        </p>

        <button
          class="btn btn-ghost settings-action"
          type="button"
          :disabled="isBusy"
          @click="emit('export-backup')"
        >
          {{ t('profile.deleteDialogExport') }}
        </button>

        <label class="account-delete__label" for="account-delete-confirm">
          {{ t('profile.deleteDialogType', { word: DELETE_CONFIRMATION }) }}
        </label>
        <input
          id="account-delete-confirm"
          v-model="typed"
          type="text"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          :placeholder="DELETE_CONFIRMATION"
          :disabled="isBusy"
        />

        <p v-if="!isOnline" class="settings-message is-warning" role="status">
          {{ offlineHint }}
        </p>
        <p v-if="error" class="settings-message is-error" role="alert">
          {{ error }}
        </p>

        <div class="modal-actions">
          <button
            class="btn btn-ghost"
            type="button"
            :disabled="isBusy"
            @click="close"
          >
            {{ t('profile.cancel') }}
          </button>
          <button
            class="btn btn-ghost settings-action--danger"
            type="button"
            :disabled="!canConfirm"
            @click="confirm"
          >
            {{
              isBusy
                ? t('profile.deleteDialogBusy')
                : t('profile.deleteDialogConfirm')
            }}
          </button>
        </div>
      </div>
    </section>
  </Teleport>
</template>
