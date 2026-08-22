<script setup lang="ts">
import {
  FOCUS_OPTIONS,
  LOAD_OPTIONS,
  START_OPTIONS,
  useStarterTemplate,
  type StarterPlan,
} from '../composables/useStarterTemplate'
import { useFocusTrap } from '../../../composables/useFocusTrap'

const emit = defineEmits<{
  (e: 'apply', plan: StarterPlan): void
  (e: 'close'): void
}>()

// Binds to the `ref="trapRef"` root element below.
useFocusTrap({ onEscape: () => emit('close') })

const { focus, start, load, plan } = useStarterTemplate()
</script>

<template>
  <div class="starter-overlay" @click.self="emit('close')">
    <div ref="trapRef" class="starter" role="dialog" aria-modal="true">
      <header class="starter__head">
        <div>
          <h2 class="starter__title">Let's build your first day</h2>
          <p class="starter__subtitle">
            Three questions and you get a day you can actually try.
          </p>
        </div>
        <button
          class="event-details__close"
          type="button"
          aria-label="Close"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <fieldset class="starter__question">
        <legend class="starter__legend">1 · What is today mostly about?</legend>
        <div class="starter__options">
          <button
            v-for="option in FOCUS_OPTIONS"
            :key="option.value"
            class="starter__option"
            :class="{ 'is-selected': focus === option.value }"
            type="button"
            @click="focus = option.value"
          >
            <strong>{{ option.label }}</strong>
            <span>{{ option.hint }}</span>
          </button>
        </div>
      </fieldset>

      <fieldset class="starter__question">
        <legend class="starter__legend">2 · When does your day start?</legend>
        <div class="starter__options">
          <button
            v-for="option in START_OPTIONS"
            :key="option.value"
            class="starter__option"
            :class="{ 'is-selected': start === option.value }"
            type="button"
            @click="start = option.value"
          >
            <strong>{{ option.label }}</strong>
            <span>{{ option.hint }}</span>
          </button>
        </div>
      </fieldset>

      <fieldset class="starter__question">
        <legend class="starter__legend">3 · How full should it be?</legend>
        <div class="starter__options">
          <button
            v-for="option in LOAD_OPTIONS"
            :key="option.value"
            class="starter__option"
            :class="{ 'is-selected': load === option.value }"
            type="button"
            @click="load = option.value"
          >
            <strong>{{ option.label }}</strong>
            <span>{{ option.hint }}</span>
          </button>
        </div>
      </fieldset>

      <!-- Preview so nothing is created blind. -->
      <section class="starter__preview">
        <p class="sidebar-caption">Your day</p>
        <div class="starter__preview-list">
          <div
            v-for="task in plan.tasks"
            :key="task.title"
            class="starter__preview-row"
          >
            <span class="starter__preview-time">
              {{ task.startTime }}–{{ task.endTime }}
            </span>
            <span>{{ task.title }}</span>
          </div>
        </div>
        <p class="starter__note">
          Creates the goal “{{ plan.goalTitle }}” with the project
          “{{ plan.projectTitle }}”. You can change or delete any of it.
        </p>
      </section>

      <div class="starter__actions">
        <button
          class="btn btn-primary"
          type="button"
          @click="emit('apply', plan)"
        >
          Create my day
        </button>
        <button class="btn btn-ghost" type="button" @click="emit('close')">
          I'll start from scratch
        </button>
      </div>
    </div>
  </div>
</template>
