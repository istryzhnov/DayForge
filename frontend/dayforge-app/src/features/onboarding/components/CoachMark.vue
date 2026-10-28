<script setup lang="ts">
import { computed, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import { useMediaQuery } from '../../../composables/useMediaQuery'
import {
  dialogOpen,
  findOnScreen,
  useCoachLayout,
  type CoachTarget,
} from '../composables/useCoachLayout'
import { TIPS, type Tip, type TipView } from '../composables/tips'
import { useTips } from '../composables/useTips'
import { useTour } from '../composables/useTour'
import { welcomeHoldsTips } from '../composables/useWelcome'
import CoachBubble from './CoachBubble.vue'

const props = defineProps<{ view: TipView }>()

const emit = defineEmits<{
  (e: 'action'): void
}>()

/** Pause before the next bubble, so one closing does not jump straight to another. */
const NEXT_DELAY_MS = 400

const { isVisible, dismiss, turnOff } = useTips()
const { running: tourRunning } = useTour()
/** Touch or a phone-width screen: the same cut the phone layout uses. */
const isMobile = useMediaQuery('(pointer: coarse), (max-width: 720px)')
const bubble = useTemplateRef<InstanceType<typeof CoachBubble>>('bubble')

function fitsDevice(tip: Tip): boolean {
  if (tip.only === 'desktop') return !isMobile.value
  if (tip.only === 'mobile') return isMobile.value
  return true
}

/**
 * Sidebar tips sit beside the goals list, so they also show on the goals screen.
 * The tour explains the same controls step by step, so tips wait while it runs.
 */
const candidates = computed(() =>
  welcomeHoldsTips.value || tourRunning.value
    ? []
    : TIPS.filter(
        (tip) =>
          (tip.view === props.view ||
            (tip.view === 'sidebar' && props.view === 'goals')) &&
          fitsDevice(tip) &&
          isVisible(tip.id),
      ),
)

let cooling = false
let coolTimer = 0

/**
 * Keeps the bubble that is already up while its control stays on screen, so
 * scrolling does not swap one tip for the next. Otherwise the first candidate
 * with a visible control wins.
 */
function resolve(): (CoachTarget & { tip: Tip }) | null {
  if (cooling || dialogOpen()) return null
  const current = shown.value
  if (current && candidates.value.includes(current)) {
    const el = findOnScreen(`[data-tip-anchor="${current.anchor}"]`)
    if (el) {
      return { tip: current, el, placement: current.placement ?? 'bottom' }
    }
  }
  for (const tip of candidates.value) {
    const el = findOnScreen(`[data-tip-anchor="${tip.anchor}"]`)
    if (el) return { tip, el, placement: tip.placement ?? 'bottom' }
  }
  return null
}

const { target, position, schedule, hide } = useCoachLayout<
  CoachTarget & { tip: Tip }
>(
  () => resolve(),
  () => (bubble.value?.$el as HTMLElement | undefined) ?? null,
)

const shown = computed<Tip | null>(() => target.value?.tip ?? null)

function dismissShown() {
  const tip = shown.value
  if (!tip) return
  dismiss(tip.id)
  hide()
  cooling = true
  window.clearTimeout(coolTimer)
  coolTimer = window.setTimeout(() => {
    cooling = false
    schedule()
  }, NEXT_DELAY_MS)
}

/** Using the action counts as having read the tip. */
function runAction() {
  if (!shown.value) return
  dismissShown()
  emit('action')
}

/** Esc closes the bubble, but not while a dialog or a text field has the key. */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented || !shown.value) return
  if (document.querySelector('[aria-modal="true"]')) return
  const focused = event.target as HTMLElement | null
  if (
    focused &&
    (focused.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(focused.tagName))
  ) {
    return
  }
  dismissShown()
}

const bodyText = computed(() => {
  const tip = shown.value
  if (!tip) return ''
  return isMobile.value && tip.touchBody ? tip.touchBody : tip.body
})

// Re-resolve when the candidates change: a view switch, a dismissal, or new data.
watch(candidates, () => schedule())

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.clearTimeout(coolTimer)
})
</script>

<template>
  <Teleport to="body">
    <CoachBubble
      v-if="shown && position"
      ref="bubble"
      :title="shown.title"
      :body="bodyText"
      :position="position"
      close-label="Dismiss tip"
      @close="dismissShown"
    >
      <template #actions>
        <button
          v-if="shown.action"
          class="coach-mark__action"
          type="button"
          @click="runAction"
        >
          {{ shown.action.label }}
        </button>
        <button class="coach-mark__quiet" type="button" @click="turnOff">
          Turn off tips
        </button>
      </template>
    </CoachBubble>
  </Teleport>
</template>
