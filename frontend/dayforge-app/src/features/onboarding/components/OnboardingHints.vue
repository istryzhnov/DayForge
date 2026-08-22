<script setup lang="ts">
const emit = defineEmits<{
  (e: 'open-starter'): void
}>()

/** Explains the three concepts that are not obvious from an empty screen. */
const CONCEPTS = [
  {
    title: 'Goals are tags',
    body: 'Pick one in the sidebar to filter the list. A task can live without a goal.',
  },
  {
    title: 'Any task can become a project',
    body: 'Right-click a task and choose "Set as project" — or press + on it to add work underneath.',
  },
  {
    title: 'Planned tasks have a date',
    body: 'Schedule a task for a specific day — a dentist visit, a birthday. They live in their own list and never get lost.',
  },
  {
    title: 'The calendar is the day',
    body: 'Drag a task onto the grid to give it a time, or draw a block on empty space to create one.',
  },
] as const
</script>

<template>
  <section class="onboarding">
    <header class="onboarding__head">
      <h2 class="onboarding__title">Welcome to DayForge</h2>
      <p class="onboarding__subtitle">
        Plan a day, repeat what works, and keep track of what you actually got
        done.
      </p>
    </header>

    <div class="onboarding__grid">
      <article
        v-for="concept in CONCEPTS"
        :key="concept.title"
        class="onboarding__card"
      >
        <strong class="onboarding__card-title">{{ concept.title }}</strong>
        <p class="onboarding__card-body">{{ concept.body }}</p>
      </article>
    </div>

    <div class="onboarding__cta">
      <button class="btn btn-primary" type="button" @click="emit('open-starter')">
        Build my first day
      </button>
      <span class="onboarding__cta-hint">
        Three questions — or just add a task below.
      </span>
    </div>
  </section>
</template>
