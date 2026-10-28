<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
import { useI18n } from 'vue-i18n'
import {
  QUICK_ADD_SYNTAX,
  SHORTCUT_GROUPS,
  useHotkeyOverlay,
} from '../../../composables/useHotkeys'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import { useMediaQuery } from '../../../composables/useMediaQuery'
import { useSettings } from '../../../composables/useSettings'
import TourChapterList from '../../onboarding/components/TourChapterList.vue'
import { TOUCH_LAYOUT_QUERY } from '../../onboarding/composables/touchLayout'
import { useTips } from '../../onboarding/composables/useTips'
import { COACH_TIPS_ENABLED } from '../../onboarding/composables/tips'

const { t } = useI18n()
const { closeOverlay } = useHotkeyOverlay()
const { settings } = useSettings()
const { resetTips } = useTips()
/** Touch has no keyboard: the key lists would only describe what cannot be pressed. */
const isMobile = useMediaQuery(TOUCH_LAYOUT_QUERY)

/** Closes the panel too, so the first bubble has something to point at. */
function showTipsAgain() {
  resetTips()
  closeOverlay()
}

/** Starting a chapter closes the panel, so its first bubble is not hidden behind it. */
function chapterStarted() {
  closeOverlay()
}

// The close button is the first control, so it takes focus on open.
useFocusTrap({ onEscape: () => closeOverlay() })
</script>

<template>
  <Teleport to="body">
    <section
      ref="trapRef"
      class="quick-add-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="t('hotkeys.help')"
    >
      <div class="modal-overlay" @click="closeOverlay"></div>
      <div class="shortcuts-card">
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
          <div
            v-if="COACH_TIPS_ENABLED"
            class="shortcuts-row shortcuts-row--tips"
          >
            <span>{{ t('hotkeys.tipsHint') }}</span>
            <button class="btn btn-ghost" type="button" @click="showTipsAgain">
              {{ t('hotkeys.showTipsAgain') }}
            </button>
          </div>
          <p class="shortcuts-card__note">{{ t('hotkeys.tourHint') }}</p>
          <TourChapterList @start="chapterStarted" />
        </section>

        <template v-if="!isMobile">
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
        </template>

        <p class="settings-group-hint legal-links">
          <a href="/about">{{ t('profile.aboutLink') }}</a>
        </p>
      </div>
    </section>
  </Teleport>
</template>
