<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Client } from '../../../entities/BillingEntity'
import { useSettings } from '../../../composables/useSettings'
import { CLIENT_LIMITS } from '../../../composables/billing/clients'
import { createId } from '../../../composables/goalSpace/date'
import { textValue } from '../../../composables/inputValue'

const { settings, update } = useSettings()
const { t } = useI18n()

const newName = ref('')
const newEmail = ref('')

const clients = computed(() => settings.billing.clients)
const activeClients = computed(() =>
  clients.value.filter((client) => !client.archived),
)
const archivedClients = computed(() =>
  clients.value.filter((client) => client.archived),
)

function saveClients(next: Client[]) {
  update('billing', { clients: next })
}

function patchClient(clientId: string, patch: Partial<Client>) {
  saveClients(
    clients.value.map((client) =>
      client.id === clientId ? { ...client, ...patch } : client,
    ),
  )
}

/** Blank fields are dropped by the sanitiser, so clearing one removes it. */
function renameClient(client: Client, value: string) {
  const name = value.trim()
  if (name === '') return
  patchClient(client.id, { name })
}

function setOptionalText(
  client: Client,
  field: 'email' | 'notes',
  value: string,
) {
  patchClient(client.id, { [field]: value.trim() || undefined })
}

function setArchived(client: Client, archived: boolean) {
  patchClient(client.id, { archived: archived || undefined })
}

function addClient() {
  const name = newName.value.trim()
  if (name === '') return
  if (clients.value.length >= CLIENT_LIMITS.COUNT_MAX) return

  const email = newEmail.value.trim()
  saveClients([
    ...clients.value,
    {
      id: createId('client'),
      name,
      ...(email ? { email } : {}),
    },
  ])
  newName.value = ''
  newEmail.value = ''
}
</script>

<template>
  <div class="settings-section">
    <p class="settings-section__intro">{{ t('billing.clientsIntro') }}</p>

    <form class="settings-client-form" @submit.prevent="addClient">
      <label class="settings-field">
        {{ t('billing.clientName') }}
        <input
          v-model="newName"
          type="text"
          :maxlength="CLIENT_LIMITS.NAME_MAX"
          placeholder="Acme Ltd"
        />
      </label>
      <label class="settings-field">
        {{ t('billing.emailOptional') }}
        <input
          v-model="newEmail"
          type="email"
          :maxlength="CLIENT_LIMITS.EMAIL_MAX"
          placeholder="billing@acme.test"
        />
      </label>
      <button
        class="btn btn-ghost settings-action"
        type="submit"
        :disabled="newName.trim() === ''"
      >
        {{ t('billing.addClient') }}
      </button>
    </form>

    <p class="ui-section-label ui-section-label--wrap">
      {{ t('billing.activeClients') }}
    </p>
    <p v-if="activeClients.length === 0" class="settings-group-hint">
      {{ t('billing.noActiveClients') }}
    </p>

    <div
      v-for="client in activeClients"
      :key="client.id"
      class="settings-client"
    >
      <label class="settings-field">
        {{ t('billing.fieldName') }}
        <input
          type="text"
          :value="client.name"
          :maxlength="CLIENT_LIMITS.NAME_MAX"
          @change="renameClient(client, textValue($event))"
        />
      </label>
      <label class="settings-field">
        {{ t('billing.fieldEmail') }}
        <input
          type="email"
          :value="client.email ?? ''"
          :maxlength="CLIENT_LIMITS.EMAIL_MAX"
          @change="setOptionalText(client, 'email', textValue($event))"
        />
      </label>
      <label class="settings-field">
        {{ t('billing.fieldNotes') }}
        <textarea
          rows="2"
          :value="client.notes ?? ''"
          :maxlength="CLIENT_LIMITS.NOTES_MAX"
          @change="setOptionalText(client, 'notes', textValue($event))"
        ></textarea>
      </label>
      <button
        class="btn btn-ghost settings-action"
        type="button"
        @click="setArchived(client, true)"
      >
        {{ t('billing.archiveClient', { name: client.name }) }}
      </button>
    </div>

    <template v-if="archivedClients.length > 0">
      <p class="ui-section-label ui-section-label--wrap">
        {{ t('billing.archivedClients') }}
      </p>
      <p class="settings-group-hint">
        {{ t('billing.archivedHint') }}
      </p>
      <div
        v-for="client in archivedClients"
        :key="client.id"
        class="settings-client settings-client--archived"
      >
        <span class="settings-client__name">{{ client.name }}</span>
        <button
          class="btn btn-ghost settings-action"
          type="button"
          @click="setArchived(client, false)"
        >
          {{ t('billing.restoreClient', { name: client.name }) }}
        </button>
      </div>
    </template>
  </div>
</template>
