<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
import { onMounted, useTemplateRef } from 'vue'
import {
  QUICK_ADD_SYNTAX,
  SHORTCUT_GROUPS,
  useHotkeyOverlay,
} from '../../../composables/useHotkeys'
import { useSettings } from '../../../composables/useSettings'
import { useTips } from '../../onboarding/composables/useTips'

const { closeOverlay } = useHotkeyOverlay()
const { settings } = useSettings()
const { resetTips } = useTips()

/** Closes the panel too, so the first bubble has something to point at. */
function showTipsAgain() {
  resetTips()
  closeOverlay()
}

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
      aria-label="Help"
    >
      <div class="modal-overlay" @click="closeOverlay"></div>
      <div
        ref="cardRef"
        class="shortcuts-card"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <header class="shortcuts-card__head">
          <h3>Help</h3>
          <button
            class="event-details__close"
            type="button"
            aria-label="Close"
            @click="closeOverlay"
          >
            <AppIcon name="close" :size="14" />
          </button>
        </header>

        <section class="shortcuts-group">
          <p class="sidebar-caption">Tips</p>
          <div class="shortcuts-row shortcuts-row--tips">
            <span>Short notes that point at what each control does.</span>
            <button class="btn btn-ghost" type="button" @click="showTipsAgain">
              Show tips again
            </button>
          </div>
        </section>

        <p
          v-if="!settings.behavior.keyboardShortcuts"
          class="shortcuts-card__note"
        >
          Keyboard shortcuts are off. Turn them on in Settings, Behaviour.
        </p>

        <section
          v-for="group in settings.behavior.keyboardShortcuts
            ? SHORTCUT_GROUPS
            : []"
          :key="group.title"
          class="shortcuts-group"
        >
          <p class="sidebar-caption">{{ group.title }}</p>
          <div v-for="row in group.rows" :key="row.label" class="shortcuts-row">
            <span>{{ row.label }}</span>
            <span class="shortcuts-row__keys">
              <template v-for="(key, index) in row.keys" :key="key">
                <span v-if="index > 0" class="shortcuts-row__then">then</span>
                <kbd>{{ key }}</kbd>
              </template>
            </span>
          </div>
        </section>

        <section
          v-if="settings.behavior.keyboardShortcuts"
          class="shortcuts-group"
        >
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

        <p
          v-if="settings.behavior.keyboardShortcuts"
          class="shortcuts-card__note"
        >
          Shortcuts stay quiet while you type in a field. Turn them off in
          Settings, Behaviour.
        </p>
      </div>
    </section>
  </Teleport>
</template>
