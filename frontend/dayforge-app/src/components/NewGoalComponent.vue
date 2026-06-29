<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'submit', title: string, description: string): void
  (e: 'cancel'): void
}>()

const title = ref('')
const description = ref('')

function submit() {
  const trimmedTitle = title.value.trim()
  if (!trimmedTitle) return

  emit('submit', trimmedTitle, description.value.trim())
  title.value = ''
  description.value = ''
}
</script>
<template>
  <section class="new-goal-modal">
    <div class="modal-overlay" @click="$emit('cancel')"></div>
    <div class="modal-card">
      <h3>New Goal</h3>
      <input
        v-model="title"
        type="text"
        placeholder="Goal title"
        @keydown.enter="submit"
      />
      <textarea
        v-model="description"
        placeholder="Goal description"
        @keydown.enter="submit"
      ></textarea>
      <div class="modal-actions">
        <button class="btn btn-primary" @click="$emit('cancel')">Cancel</button>
        <button class="btn btn-ghost" @click="submit">Add Goal</button>
      </div>
    </div>
  </section>
</template>
