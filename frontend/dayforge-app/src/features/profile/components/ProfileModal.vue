<script setup lang="ts">
import ProfileAvatar from './ProfileAvatar.vue'
import { useProfile } from '../composables/useProfile'
import { useFocusTrap } from '../../../composables/useFocusTrap'

const emit = defineEmits<{ (e: 'close'): void }>()

useFocusTrap({ onEscape: () => emit('close') })

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
        <h3 id="profile-title">Profile</h3>
        <button
          class="event-details__close"
          type="button"
          aria-label="Close"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <template v-if="!auth.isConfigured">
        <p class="settings-group-hint">
          This build has no sync keys, so DayForge is working entirely in this
          browser — which is exactly how it has always worked. Adding
          <code>VITE_SUPABASE_URL</code> and
          <code>VITE_SUPABASE_ANON_KEY</code> to the project's
          <code>.env</code> turns an account on, once the tables in
          <code>supabase/schema.sql</code> have been created.
        </p>
      </template>

      <template v-else-if="!auth.isSignedIn.value">
        <div class="profile-card__hero">
          <ProfileAvatar :avatar-url="null" initial="" :signed-in="false" />
          <div>
            <strong>Sign in or create an account</strong>
            <p class="settings-group-hint">
              Keep the same projects, tasks and tracked time on every device.
            </p>
          </div>
        </div>

        <button
          class="btn btn-primary settings-action"
          type="button"
          :disabled="auth.isBusy.value || !auth.isReady.value"
          @click="signIn"
        >
          {{ auth.isBusy.value ? 'Opening Google…' : 'Continue with Google' }}
        </button>

        <p class="settings-group-hint legal-links">
          By signing in you agree to the
          <a href="/terms.html" target="_blank" rel="noopener">Terms</a> and
          <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.
        </p>

        <p class="settings-group-hint legal-links">
          <a href="/about">About DayForge</a>
        </p>

        <p class="settings-group-hint">
          New here? The same button creates the account. Without one nothing
          leaves this browser, and everything keeps working as it does now.
        </p>
        <p class="settings-group-hint">
          Your existing projects and tasks are kept. The first sign-in brings
          them together with whatever the account already holds, and tucks a
          copy of the current state away first — see Backup and data in
          settings.
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
          Nothing is lost while they wait. They are stored here and sent once
          there is a connection.
        </p>

        <div v-if="failures.length > 0" class="account-failures">
          <strong>
            {{ failures.length }} change{{ failures.length === 1 ? '' : 's' }}
            the server refused
          </strong>
          <p>
            Retrying these will not help on its own, so they were set aside
            rather than left to block everything behind them.
          </p>
          <ul>
            <li v-for="failure in failures.slice(0, 5)" :key="failure.id">
              {{ failure.table }} · {{ failure.op }} ·
              {{ failure.lastError ?? 'refused' }}
            </li>
          </ul>
          <button class="btn btn-ghost" type="button" @click="retryDead">
            Try these again
          </button>
          <button
            class="btn btn-ghost settings-action--danger"
            type="button"
            @click="discardDead"
          >
            Give up on them
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
          {{ logCopied ? 'Copied' : 'Copy sync log' }}
        </button>

        <button
          class="btn btn-ghost settings-action settings-action--danger"
          type="button"
          :disabled="auth.isBusy.value"
          @click="signOut"
        >
          Sign out
        </button>
        <p class="settings-group-hint">
          Signing out leaves every project and task here, on this device. It
          only stops them being sent anywhere.
        </p>
      </template>
    </div>
  </section>
</template>
