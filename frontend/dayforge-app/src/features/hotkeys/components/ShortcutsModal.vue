<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
import { onMounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  QUICK_ADD_SYNTAX,
  SHORTCUT_GROUPS,
  useHotkeyOverlay,
} from '../../../composables/useHotkeys'
import { useSettings } from '../../../composables/useSettings'
import { useTips } from '../../onboarding/composables/useTips'
import { useTour } from '../../onboarding/composables/useTour'

const { t } = useI18n()
const { closeOverlay } = useHotkeyOverlay()
const { settings } = useSettings()
const { resetTips } = useTips()
const { restart: restartTour } = useTour()

/** Closes the panel too, so the first bubble has something to point at. */
function showTipsAgain() {
  resetTips()
  closeOverlay()
}

/** Starts the step-by-step tour from the first step, even after it was finished. */
function takeTour() {
  restartTour()
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
      :aria-label="t('hotkeys.help')"
    >
      <div class="modal-overlay" @click="closeOverlay"></div>
      <div
        ref="cardRef"
        class="shortcuts-card"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <header class="shortcuts-card__head">
          <h3>{{ t('hotkeys.help') }}</h3>
          <button
            class="event-details__close"
            type="button"
            :aria-label="t('common.close')"
            @click="closeOverlay"
          >
            <AppIcon name="close" :size="14" />
          </button>
        </header>

        <section class="shortcuts-group">
          <p class="sidebar-caption">{{ t('hotkeys.tips') }}</p>
          <div class="shortcuts-row shortcuts-row--tips">
            <span>{{ t('hotkeys.tipsHint') }}</span>
            <button class="btn btn-ghost" type="button" @click="showTipsAgain">
              {{ t('hotkeys.showTipsAgain') }}
            </button>
          </div>
          <div class="shortcuts-row shortcuts-row--tips">
            <span>{{ t('hotkeys.tourHint') }}</span>
            <button class="btn btn-ghost" type="button" @click="takeTour">
              {{ t('hotkeys.takeTour') }}
            </button>
          </div>
        </section>

        <p
          v-if="!settings.behavior.keyboardShortcuts"
          class="shortcuts-card__note"
        >
          {{ t('hotkeys.shortcutsOff') }}
        </p>

        <section
          v-for="group in settings.behavior.keyboardShortcuts
            ? SHORTCUT_GROUPS
            : []"
          :key="group.titleKey"
          class="shortcuts-group"
        >
          <p class="sidebar-caption">{{ t(group.titleKey) }}</p>
          <div
            v-for="row in group.rows"
            :key="row.labelKey"
            class="shortcuts-row"
          >
            <span>{{ t(row.labelKey) }}</span>
            <span class="shortcuts-row__keys">
              <template v-for="(key, index) in row.keys" :key="key">
                <span v-if="index > 0" class="shortcuts-row__then">{{
                  t('hotkeys.then')
                }}</span>
                <kbd>{{ key }}</kbd>
              </template>
            </span>
          </div>
        </section>

        <section
          v-if="settings.behavior.keyboardShortcuts"
          class="shortcuts-group"
        >
          <p class="sidebar-caption">{{ t('hotkeys.quickAddGroup') }}</p>
          <div
            v-for="row in QUICK_ADD_SYNTAX"
            :key="row.labelKey"
            class="shortcuts-row"
          >
            <span>{{ t(row.labelKey) }}</span>
            <span class="shortcuts-row__keys">
              <kbd>{{ row.wordKey ? t(row.wordKey) : row.keys[0] }}</kbd>
            </span>
          </div>
        </section>

        <p
          v-if="settings.behavior.keyboardShortcuts"
          class="shortcuts-card__note"
        >
          {{ t('hotkeys.shortcutsQuiet') }}
        </p>
      </div>
    </section>
  </Teleport>
</template>
