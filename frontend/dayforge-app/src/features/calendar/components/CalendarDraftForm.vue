<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

/** The title typed for a block being drawn; the view owns creating the task. */
const title = defineModel<string>({ required: true })

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()

// The autofocus attribute only works once per page load, so focus by hand.
const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
onMounted(() => inputRef.value?.focus())
</script>

<template>
  <form class="calendar-view__draft-form" @submit.prevent="emit('submit')">
    <input
      ref="inputRef"
      v-model="title"
      type="text"
      :aria-label="t('calendar.taskTitlePlaceholder')"
      :placeholder="t('calendar.taskTitlePlaceholder')"
      @keydown.esc="emit('cancel')"
    />
    <div class="calendar-view__draft-actions">
      <button type="submit" class="btn btn-primary">
        {{ t('calendar.add') }}
      </button>
      <button type="button" class="btn btn-ghost" @click="emit('cancel')">
        {{ t('calendar.cancel') }}
      </button>
    </div>
  </form>
</template>
