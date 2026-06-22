<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { TaskTemplate } from '../entities/TaskEntity'
import type { ID, Priority } from '../entities/types'

const props = defineProps<{
  goal: Goal | null
  tasks: TaskTemplate[]
}>()

const emit = defineEmits<{
  (e: 'add-task', title: string, priority: Priority): void
  (
    e: 'add-sub-task',
    parentTemplateId: ID,
    title: string,
    priority: Priority,
  ): void
}>()

const newTaskTitle = ref('')
const newTaskPriority = ref<Priority>('minor')

const subTaskParentId = ref<ID | null>(null)
const newSubtaskTitle = ref('')
const newSubtaskPriority = ref<Priority>('minor')

type FlatNode = {
  task: TaskTemplate
  depth: number
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

  function traverse(task: TaskTemplate, depth: number) {
    out.push({ task, depth })
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
  () => props.tasks.filter((task) => task.parentTemplateId !== null).length,
)

function submitTask() {
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
  emit('add-sub-task', subTaskParentId.value, title, newSubtaskPriority.value)
  subTaskParentId.value = null
  newSubtaskTitle.value = ''
  newSubtaskPriority.value = 'minor'
}
</script>

<template>
  <section v-if="goal" class="goal">
    <header class="goal-header">
      <div>
        <h2>{{ goal.title }}</h2>
        <p v-if="goal.description">{{ goal.description }}</p>
      </div>
      <span class="goal-status">{{ goal.status }}</span>
    </header>
    <div class="kpi-row">
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

    <div class="card form">
      <input
        v-model="newTaskTitle"
        placeholder="New task title"
        @keydown.enter="submitTask"
      />
      <select v-model="newTaskPriority">
        <option value="minor">Minor</option>
        <option value="major">Major</option>
      </select>
      <button @click="submitTask">Add Task</button>
    </div>
    <div v-if="orderedFlatNodes.length" class="list">
      <div v-for="node in orderedFlatNodes" :key="node.task.id" class="row">
        <div class="left">
          <span class="dot" :class="node.task.priority"></span>
          <span>{{ node.task.title }}</span>
        </div>
        <div class="actions">
          <span class="chip">{{ node.task.priority }}</span>
          <button class="ghost" @click="openSubtask(node.task.id)">
            + subtask
          </button>
        </div>
      </div>
    </div>
    <p v-else class="empty">No tasks yet</p>

    <div v-if="subTaskParentId" class="card form sub">
      <input
        v-model="newSubtaskTitle"
        type="text"
        placeholder="New subtask title"
        @keydown.enter="submitSubtask"
      />
      <select v-model="newSubtaskPriority">
        <option value="minor">Minor</option>
        <option value="major">Major</option>
      </select>
      <button @click="submitSubtask">Add Subtask</button>
      <button class="ghost" @click="subTaskParentId = null">Cancel</button>
    </div>
  </section>
  <section v-else class="empty-state">
    <h3>No tasks available</h3>
    <p>Chose Space in sidebar to see tasks.</p>
  </section>
</template>
