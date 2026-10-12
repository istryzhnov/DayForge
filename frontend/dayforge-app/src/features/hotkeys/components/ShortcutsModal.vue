<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import {
  QUICK_ADD_SYNTAX,
  SHORTCUT_GROUPS,
  useHotkeyOverlay,
} from '../../../composables/useHotkeys'

const { closeOverlay } = useHotkeyOverlay()

const cardRef = useTemplateRef<HTMLElement>('cardRef')

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  closeOverlay()
}

onMounted(() => cardRef.value?.focus())
</script>

<template>
  <Teleport to="body">
    <section
      class="quick-add-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div class="modal-overlay" @click="closeOverlay"></div>
      <div
        ref="cardRef"
        class="shortcuts-card"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <header class="shortcuts-card__head">
          <h3>Keyboard shortcuts</h3>
          <button
            class="event-details__close"
            type="button"
            aria-label="Close"
            @click="closeOverlay"
          >
            ×
          </button>
        </header>

        <section
          v-for="group in SHORTCUT_GROUPS"
          :key="group.title"
          class="shortcuts-group"
        >
          <p class="sidebar-caption">{{ group.title }}</p>
          <div
            v-for="row in group.rows"
            :key="row.label"
            class="shortcuts-row"
          >
            <span>{{ row.label }}</span>
            <span class="shortcuts-row__keys">
              <template v-for="(key, index) in row.keys" :key="key">
                <span v-if="index > 0" class="shortcuts-row__then">then</span>
                <kbd>{{ key }}</kbd>
              </template>
            </span>
          </div>
        </section>

        <section class="shortcuts-group">
          <p class="sidebar-caption">Quick add</p>
          <div
            v-for="row in QUICK_ADD_SYNTAX"
            :key="row.label"
            class="shortcuts-row"
          >
            <span>{{ row.label }}</span>
            <span class="shortcuts-row__keys">
              <kbd>{{ row.keys[0] }}</kbd>
            </span>
          </div>
        </section>

        <p class="shortcuts-card__note">
          Shortcuts stay quiet while you type in a field. Turn them off in
          Settings, Behaviour.
        </p>
      </div>
    </section>
  </Teleport>
</template>
