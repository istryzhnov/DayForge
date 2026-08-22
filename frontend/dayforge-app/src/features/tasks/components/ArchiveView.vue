<script setup lang="ts">
import type { ArchiveBlock } from '../composables/useArchive'
import type { ISODate } from '../../../entities/types'
import { parseISODate } from '../../../composables/goalSpace/date'

defineProps<{
  blocks: ArchiveBlock[]
  totalDone: number
}>()

function dayLabel(date: ISODate) {
  return parseISODate(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}
</script>

<template>
  <section class="goal-panel">
    <header class="goal-panel-header">
      <div>
        <h2>What I did</h2>
        <p>{{ totalDone }} completed, grouped by project</p>
      </div>
    </header>

    <div v-if="blocks.length" class="archive">
      <section v-for="block in blocks" :key="block.key" class="archive-block">
        <header class="archive-block__head">
          <span class="dot major"></span>
          <div class="archive-block__copy">
            <strong class="archive-block__title">{{ block.projectTitle }}</strong>
            <span class="goal-inline-chip">{{ block.goalTitle }}</span>
          </div>
          <span class="task-repeat-chip">✓ {{ block.tasks.length }}</span>
        </header>

        <div class="archive-block__tasks">
          <div
            v-for="task in block.tasks"
            :key="task.id"
            class="archive-task"
          >
            <span class="archive-task__check">✓</span>
            <span class="archive-task__title">{{ task.title }}</span>
            <span class="archive-task__when">
              {{ dayLabel(task.date)
              }}{{ task.startTime ? ` · ${task.startTime}` : '' }}
            </span>
          </div>
        </div>
      </section>
    </div>

    <p v-else class="task-empty">
      Nothing completed yet. Finished tasks collect here so you can see what you
      actually got done.
    </p>
  </section>
</template>
