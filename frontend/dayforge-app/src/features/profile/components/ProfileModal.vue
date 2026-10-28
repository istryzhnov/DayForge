<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ProfileAvatar from './ProfileAvatar.vue'
import DeleteAccountDialog from './DeleteAccountDialog.vue'
import { useProfile } from '../composables/useProfile'
import { useAccountDeletion } from '../composables/useAccountDeletion'
import { useFocusTrap } from '../../../composables/useFocusTrap'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'export-backup'): void
}>()

useFocusTrap({ onEscape: () => emit('close') })

const { t } = useI18n()

const isDeleteOpen = ref(false)
const { isOnline, offlineHint } = useAccountDeletion()

const {
  auth,
  status,
  initial,
  avatarUrl,
  syncSummary,
  failures,
  signIn,
  signOut,
  copyLog,
  logCopied,
  retryDead,
  discardDead,
  isSigningOut,
  isSignOutConfirmOpen,
  unsyncedCount,
  confirmSignOut,
  cancelSignOut,
} = useProfile()
</script>

<template>
  <section class="profile-modal">
    <div class="modal-overlay" @click="emit('close')"></div>
    <div
      ref="trapRef"
      class="modal-card profile-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-title"
    >
      <header class="profile-card__head">
        <h3 id="profile-title">{{ t('profile.profileTitle') }}</h3>
        <button
          class="event-details__close"
          type="button"
          :aria-label="t('profile.close')"
          @click="emit('close')"
        >
          <AppIcon name="close" :size="14" />
        </button>
      </header>

      <template v-if="!auth.isConfigured">
        <i18n-t
          keypath="profile.noSyncKeysBody"
          tag="p"
          class="settings-group-hint"
        >
          <template #urlVar><code>VITE_SUPABASE_URL</code></template>
          <template #keyVar><code>VITE_SUPABASE_ANON_KEY</code></template>
          <template #schema><code>supabase/schema.sql</code></template>
        </i18n-t>
      </template>

      <template v-else-if="!auth.isSignedIn.value">
        <div class="profile-card__hero">
          <ProfileAvatar :avatar-url="null" initial="" :signed-in="false" />
          <div>
            <strong>{{ t('profile.signInTitle') }}</strong>
            <p class="settings-group-hint">
              {{ t('profile.signInBody') }}
            </p>
          </div>
        </div>

        <button
          class="btn btn-primary settings-action"
          type="button"
          :disabled="auth.isBusy.value || !auth.isReady.value"
          @click="signIn"
        >
          {{
            auth.isBusy.value
              ? t('profile.openingGoogle')
              : t('profile.continueWithGoogle')
          }}
        </button>

        <i18n-t
          keypath="profile.legalAgree"
          tag="p"
          class="settings-group-hint legal-links"
        >
          <template #terms>
            <a href="/terms.html" target="_blank" rel="noopener">{{
              t('profile.termsLink')
            }}</a>
          </template>
          <template #privacy>
            <a href="/privacy.html" target="_blank" rel="noopener">{{
              t('profile.privacyLink')
            }}</a>
          </template>
        </i18n-t>

        <p class="settings-group-hint legal-links">
          <a href="/about">{{ t('profile.aboutLink') }}</a>
        </p>

        <p class="settings-group-hint">
          {{ t('profile.newHere') }}
        </p>
        <p class="settings-group-hint">
          {{ t('profile.firstSignInNote') }}
        </p>

        <p v-if="auth.error.value" class="settings-message is-error">
          {{ auth.error.value }}
        </p>
      </template>

      <template v-else>
        <div class="account-identity">
          <ProfileAvatar
            class="profile-avatar--large"
            :avatar-url="avatarUrl"
            :initial="initial"
            :signed-in="true"
          />
          <div class="account-identity__text">
            <strong>{{ auth.displayName.value }}</strong>
            <span v-if="auth.user.value?.email">{{
              auth.user.value.email
            }}</span>
          </div>
        </div>

        <div class="profile-sync" :class="`is-${status.state}`">
          <span
            class="sync-dot profile-sync__dot"
            :class="`is-${status.state}`"
            aria-hidden="true"
          ></span>
          <span class="profile-sync__text">{{ syncSummary }}</span>
        </div>

        <p v-if="status.queued > 0" class="settings-group-hint">
          {{ t('profile.nothingLost') }}
        </p>

        <div v-if="failures.length > 0" class="account-failures">
          <strong>
            {{ t('profile.refusedChanges', failures.length) }}
          </strong>
          <p>
            {{ t('profile.refusedNote') }}
          </p>
          <ul>
            <li v-for="failure in failures.slice(0, 5)" :key="failure.id">
              {{ failure.table }} · {{ failure.op }} ·
              {{ failure.lastError ?? t('profile.refusedFallback') }}
            </li>
          </ul>
          <button class="btn btn-ghost" type="button" @click="retryDead">
            {{ t('profile.tryAgain') }}
          </button>
          <button
            class="btn btn-ghost settings-action--danger"
            type="button"
            @click="discardDead"
          >
            {{ t('profile.giveUp') }}
          </button>
        </div>

        <p v-if="auth.error.value" class="settings-message is-error">
          {{ auth.error.value }}
        </p>

        <button
          class="btn btn-ghost settings-action"
          type="button"
          @click="copyLog"
        >
          {{ logCopied ? t('profile.copied') : t('profile.copySyncLog') }}
        </button>

        <template v-if="!isSignOutConfirmOpen">
          <button
            class="btn btn-ghost settings-action settings-action--danger"
            type="button"
            :disabled="auth.isBusy.value || isSigningOut"
            @click="signOut"
          >
            {{ isSigningOut ? t('profile.signingOut') : t('profile.signOut') }}
          </button>
          <p class="settings-group-hint">
            {{ t('profile.signOutNote') }}
          </p>
        </template>

        <div v-else class="sign-out-confirm">
          <p class="settings-message is-error">
            {{ t('profile.unsyncedChanges', unsyncedCount) }}
          </p>
          <button
            class="btn btn-ghost settings-action settings-action--danger"
            type="button"
            :disabled="isSigningOut"
            @click="confirmSignOut"
          >
            {{ t('profile.signOutAnyway') }}
          </button>
          <button
            class="btn btn-ghost settings-action"
            type="button"
            @click="cancelSignOut"
          >
            {{ t('profile.cancel') }}
          </button>
        </div>

        <button
          class="btn btn-ghost settings-action settings-action--danger"
          type="button"
          :disabled="!isOnline"
          @click="isDeleteOpen = true"
        >
          {{ t('profile.deleteAccount') }}
        </button>
        <p v-if="!isOnline" class="settings-group-hint">{{ offlineHint }}</p>
        <p v-else class="settings-group-hint">
          {{ t('profile.deleteAccountNote') }}
        </p>

        <DeleteAccountDialog
          v-if="isDeleteOpen"
          @close="isDeleteOpen = false"
          @export-backup="emit('export-backup')"
        />
      </template>
    </div>
  </section>
</template>
