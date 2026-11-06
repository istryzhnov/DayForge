<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * The floating copy of a task that is being dragged. It follows the pointer
 * (or the finger, placed above it so the finger does not cover it). Drawn in
 * the body so no list or column clips it; `pointer-events: none` keeps it out
 * of `elementFromPoint`, which the drop targets rely on.
 */
const { t } = useI18n()

withDefaults(
  defineProps<{
    title: string
    x: number
    y: number
    /** Project colour for the accent bar; the accent colour when absent. */
    color?: string
    isMajor?: boolean
    /** A finger drags it: the copy sits above the touch point. */
    touch?: boolean
  }>(),
  { color: undefined, isMajor: false, touch: false },
)
</script>

<template>
  <Teleport to="body">
    <div
      class="drag-ghost"
      :class="{ 'is-touch': touch }"
      :style="{
        left: `${x}px`,
        top: `${y}px`,
        '--drag-ghost-color': color ?? 'var(--accent)',
      }"
      aria-hidden="true"
    >
      <span class="drag-ghost__bar"></span>
      <span class="drag-ghost__title">{{ title }}</span>
      <span
        v-if="isMajor"
        class="drag-ghost__priority"
        :title="t('tasks.priorityLabel', { level: t('tasks.priorityMajor') })"
      ></span>
    </div>
  </Teleport>
</template>

<style>
/* Global, not scoped: the ghost is teleported to <body>. */
.drag-ghost {
  position: fixed;
  z-index: 1300;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 0.5625rem;
  box-sizing: border-box;
  width: max-content;
  max-width: 15rem;
  padding: 0.5625rem 0.75rem 0.5625rem 0;
  border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--line));
  border-radius: calc(12px * var(--radius-scale));
  background: var(--panel);
  color: var(--text);
  font-size: calc(0.8125rem * var(--text-scale));
  box-shadow: var(--shadow-lg);
  /* Pointer side: sits just below and to the right of the cursor. */
  transform: translate(0.875rem, 0.75rem) rotate(2deg) scale(1.02);
  transform-origin: 0 0;
  animation: drag-ghost-in 0.14s ease-out both;
}

/* Finger side: centred above the touch point, clear of the thumb. */
.drag-ghost.is-touch {
  transform: translate(-50%, calc(-100% - 2.5rem)) rotate(2deg) scale(1.02);
  transform-origin: 50% 100%;
}

.drag-ghost__bar {
  align-self: stretch;
  width: 0.25rem;
  margin: -0.5625rem 0 -0.5625rem 0;
  border-radius: 0 3px 3px 0;
  background: var(--drag-ghost-color);
}

.drag-ghost__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  line-height: 1.3;
}

.drag-ghost__priority {
  flex: none;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--major);
}

@keyframes drag-ghost-in {
  from {
    opacity: 0;
    filter: blur(1px);
  }
  to {
    opacity: 1;
    filter: none;
  }
}

/* Reduced motion: the copy stays flat and still; no tilt, no grow, no fade. */
@media (prefers-reduced-motion: reduce) {
  .drag-ghost,
  .drag-ghost.is-touch {
    transform: translate(0.875rem, 0.75rem);
    animation: none;
  }

  .drag-ghost.is-touch {
    transform: translate(-50%, calc(-100% - 2.5rem));
  }
}

:root[data-motion='reduced'] .drag-ghost,
:root[data-motion='reduced'] .drag-ghost.is-touch {
  animation: none;
}

:root[data-motion='reduced'] .drag-ghost {
  transform: translate(0.875rem, 0.75rem);
}

:root[data-motion='reduced'] .drag-ghost.is-touch {
  transform: translate(-50%, calc(-100% - 2.5rem));
}
</style>
