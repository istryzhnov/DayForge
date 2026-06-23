<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { TaskTemplate } from '../entities/TaskEntity'
import type { ID, Priority } from '../entities/types'

const props = defineProps<{
  goal: Goal | null
  goals: Goal[]
  tasks: TaskTemplate[]
  isAllMode: boolean
}>()

const emit = defineEmits<{
  (e: 'add-task', title: string, priority: Priority): void
  (
    e: 'add-subtask',
    parentTemplateId: ID,
    title: string,
    priority: Priority,
  ): void
}>()

const newTaskTitle = ref('')
const newTaskPriority = ref<Priority>('major')

const subTaskParentId = ref<ID | null>(null)
const newSubtaskTitle = ref('')
const newSubtaskPriority = ref<Priority>('minor')

type FlatNode = {
  task: TaskTemplate
  depth: number
  goalTitle: string
}

const orderedFlatNodes = computed<FlatNode[]>(() => {
  const sorted = [...props.tasks].sort((a, b) => a.order - b.order)

  const childrenMap = new Map<ID, TaskTemplate[]>()
  const roots: TaskTemplate[] = []

  for (const task of sorted) {
    if (!task.parentTemplateId) {
      roots.push(task)
      continue
    }
    const list = childrenMap.get(task.parentTemplateId) ?? []
    list.push(task)
    childrenMap.set(task.parentTemplateId, list)
  }
  const out: FlatNode[] = []
  const goalById = new Map(props.goals.map((goal) => [goal.id, goal.title]))

  function traverse(task: TaskTemplate, depth: number) {
    out.push({
      task,
      depth,
      goalTitle: goalById.get(task.goalId) ?? 'Unknown Goal',
    })
    const children = (childrenMap.get(task.id) ?? []).sort(
      (a, b) => a.order - b.order,
    )
    for (const child of children) {
      traverse(child, depth + 1)
    }
  }

  for (const root of roots) {
    traverse(root, 0)
  }

  return out
})

const totalCount = computed(() => props.tasks.length)
const majorCount = computed(
  () => props.tasks.filter((task) => task.priority === 'major').length,
)
const subCount = computed(
  () => props.tasks.filter((task) => !!task.parentTemplateId).length,
)

const panelTitle = computed(() =>
  props.isAllMode ? 'All Goals' : (props.goal?.title ?? 'Goal'),
)

const panelDescription = computed(() =>
  props.isAllMode
    ? 'Overview of all tasks across your goals.'
    : (props.goal?.description ?? 'Detailed task breakdown for this goal.'),
)

function submitTask() {
  if (props.isAllMode) return
  const title = newTaskTitle.value.trim()
  if (!title) return
  emit('add-task', title, newTaskPriority.value)
  newTaskTitle.value = ''
  newTaskPriority.value = 'minor'
}

function openSubtask(parentId: ID) {
  subTaskParentId.value = parentId
  newSubtaskTitle.value = ''
  newSubtaskPriority.value = 'minor'
}

function submitSubtask() {
  if (!subTaskParentId.value) return
  const title = newSubtaskTitle.value.trim()
  if (!title) return
  emit('add-subtask', subTaskParentId.value, title, newSubtaskPriority.value)
  subTaskParentId.value = null
  newSubtaskTitle.value = ''
  newSubtaskPriority.value = 'minor'
}
</script>

<template>
  <section class="goal-panel">
    <header class="goal-panel-header">
      <div>
        <h2>{{ panelTitle }}</h2>
        <p>{{ panelDescription }}</p>
      </div>
      <span class="goal-status">{{
        isAllMode ? 'overview' : goal?.status
      }}</span>
    </header>

    <div class="goal-kpi-row">
      <article class="kpi">
        <span>Total</span>
        <strong>{{ totalCount }}</strong>
      </article>
      <article class="kpi">
        <span>Major</span>
        <strong>{{ majorCount }}</strong>
      </article>
      <article class="kpi">
        <span>Subtasks</span>
        <strong>{{ subCount }}</strong>
      </article>
    </div>

    <p v-if="isAllMode" class="goal-hint">
      Select a specific goal in the sidebar to add a new top-level task.
    </p>

    <div v-else class="goal-form-card">
      <input
        v-model="newTaskTitle"
        type="text"
        placeholder="New task title"
        @keydown.enter="submitTask"
      />

      <button class="btn btn-primary" @click="submitTask">Add Task</button>
    </div>

    <div v-if="orderedFlatNodes.length" class="task-list">
      <div
        v-for="node in orderedFlatNodes"
        :key="node.task.id"
        class="task-row"
        :style="{ paddingLeft: `${16 + node.depth * 22}px` }"
      >
        <div class="left">
          <span class="dot" :class="node.task.priority"></span>
          <span>{{ node.task.title }}</span>
          <span v-if="isAllMode" class="goal-inline-chip">{{
            node.goalTitle
          }}</span>
        </div>
        <div class="actions">
          <span class="task-priority-chip">{{ node.task.priority }}</span>
          <button class="btn btn-ghost" @click="openSubtask(node.task.id)">
            + subtask
          </button>
        </div>
      </div>
    </div>
    <p v-else class="task-empty">No tasks yet</p>

    <div v-if="subTaskParentId" class="goal-form-card goal-form-sub">
      <input
        v-model="newSubtaskTitle"
        type="text"
        placeholder="New subtask title"
        @keydown.enter="submitSubtask"
      />

      <button class="btn btn-primary" @click="submitSubtask">
        Add Subtask
      </button>
      <button class="btn btn-ghost" @click="subTaskParentId = null">
        Cancel
      </button>
    </div>
  </section>
</template>
