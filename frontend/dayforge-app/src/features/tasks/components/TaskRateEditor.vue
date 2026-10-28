<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaskNode } from '../../../composables/useTaskTree'
import { useTaskRateEditor } from '../composables/useTaskRateEditor'

const props = defineProps<{ node: TaskNode }>()

const emit = defineEmits<{
  (e: 'save', hourlyRate: number | undefined): void
  (e: 'close'): void
}>()

const { t } = useI18n()
const rateInput = useTemplateRef<HTMLInputElement>('rateInput')

const { draft, currency, hasOwnRate, isValid, hint, placeholder, save, clear } =
  useTaskRateEditor(props, {
    onSave: (hourlyRate) => {
      emit('save', hourlyRate)
      emit('close')
    },
  })

onMounted(() => rateInput.value?.focus())
</script>

<template>
  <div class="task-editor" @keydown.esc="emit('close')">
    <label class="task-editor__field">
      <span class="task-schedule__label">
        {{ t('tasks.rateLabel', { title: node.task.title, currency }) }}
      </span>
      <input
        ref="rateInput"
        v-model="draft"
        type="number"
        min="0"
        step="1"
        inputmode="decimal"
        :placeholder="placeholder"
        @keydown.enter="save"
      />
    </label>

    <p class="task-editor__hint">{{ hint }}</p>

    <div class="task-editor__actions">
      <button class="btn btn-ghost" type="button" @click="emit('close')">
        {{ t('common.cancel') }}
      </button>
      <button
        v-if="hasOwnRate"
        class="btn btn-ghost"
        type="button"
        @click="clear"
      >
        {{ t('tasks.useInherited') }}
      </button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="!isValid"
        @click="save"
      >
        {{ t('common.save') }}
      </button>
    </div>
  </div>
</template>
