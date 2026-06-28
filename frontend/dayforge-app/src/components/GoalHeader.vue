<script setup lang="ts">
defineProps<{
  title: string
  description: string
  status: string
  totalCount: number
  majorCount: number
  subCount: number
}>()
</script>
<template>
  <header class="goal-panel-header">
    <div>
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
    </div>
  </header>
  <div class="goal-kpi-row">
    <article class="kpi">
      <h3>Total Tasks</h3>
      <p>{{ totalCount }}</p>
    </article>
    <article class="kpi">
      <h3>Major Tasks</h3>
      <p>{{ majorCount }}</p>
    </article>
    <article class="kpi">
      <h3>Subtasks</h3>
      <p>{{ subCount }}</p>
    </article>
  </div>
</template>
