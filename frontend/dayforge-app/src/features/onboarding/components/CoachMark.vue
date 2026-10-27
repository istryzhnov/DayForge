<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  shallowRef,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import AppIcon from '../../../components/AppIcon.vue'
import { useMediaQuery } from '../../../composables/useMediaQuery'
import {
  isOnScreen,
  isSamePosition,
  placeCoach,
  type CoachPosition,
} from '../composables/coachPosition'
import { TIPS, type Tip, type TipView } from '../composables/tips'
import { useTips } from '../composables/useTips'
import { welcomeHoldsTips } from '../composables/useWelcome'

const props = defineProps<{ view: TipView }>()

const emit = defineEmits<{
  (e: 'action'): void
}>()

/** Keeps a bubble from leaving a phone screen; the CSS uses the same width. */
const BUBBLE_WIDTH = 280
const MARGIN = 12
/** Pause before the next bubble, so one closing does not jump straight to another. */
const NEXT_DELAY_MS = 400

const { isVisible, dismiss, turnOff } = useTips()
/** Touch or a phone-width screen: the same cut the phone layout uses. */
const isMobile = useMediaQuery('(pointer: coarse), (max-width: 720px)')
const bubble = useTemplateRef<HTMLElement>('bubble')

function fitsDevice(tip: Tip): boolean {
  if (tip.only === 'desktop') return !isMobile.value
  if (tip.only === 'mobile') return isMobile.value
  return true
}

/** Sidebar tips sit beside the goals list, so they also show on the goals screen. */
const candidates = computed(() =>
  welcomeHoldsTips.value
    ? []
    : TIPS.filter(
        (tip) =>
          (tip.view === props.view ||
            (tip.view === 'sidebar' && props.view === 'goals')) &&
          fitsDevice(tip) &&
          isVisible(tip.id),
      ),
)

const shown = shallowRef<Tip | null>(null)
const position = ref<CoachPosition | null>(null)
let anchorEl: Element | null = null
let frame = 0
let cooling = false
let coolTimer = 0

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight }
}

/** Measured after render, so a bubble that changes size is placed again. */
function bubbleSize() {
  const el = bubble.value
  if (!el)
    return {
      width: Math.min(BUBBLE_WIDTH, viewport().width - 2 * MARGIN),
      height: 120,
    }
  return { width: el.offsetWidth, height: el.offsetHeight }
}

/**
 * A closed phone drawer is moved off screen and hidden, so its controls can
 * have a box without being usable. Visibility is checked for that case.
 */
function isShown(el: Element): boolean {
  return el.checkVisibility?.({ visibilityProperty: true }) ?? true
}

function findAnchor(name: string): Element | null {
  const found = Array.from(
    document.querySelectorAll(`[data-tip-anchor="${name}"]`),
  )
  return (
    found.find(
      (el) => isShown(el) && isOnScreen(el.getBoundingClientRect(), viewport()),
    ) ?? null
  )
}

/** A dialog covers the page, so a bubble under it would only be noise. */
function dialogOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null
}

/**
 * Keeps the bubble that is already up while its control stays on screen, so
 * scrolling does not swap one tip for the next. Otherwise the first candidate
 * with a visible control wins.
 */
function resolve(): { tip: Tip; el: Element } | null {
  const current = shown.value
  if (current && candidates.value.includes(current)) {
    const el = findAnchor(current.anchor)
    if (el) return { tip: current, el }
  }
  for (const tip of candidates.value) {
    const el = findAnchor(tip.anchor)
    if (el) return { tip, el }
  }
  return null
}

// Watches the anchor's size, so a control that grows or moves re-places the bubble.
const resizeObserver = new ResizeObserver(() => schedule())

function setAnchor(el: Element | null) {
  if (el === anchorEl) return
  if (anchorEl) resizeObserver.unobserve(anchorEl)
  anchorEl = el
  if (el) resizeObserver.observe(el)
}

function hide() {
  setAnchor(null)
  shown.value = null
  position.value = null
}

function update() {
  frame = 0
  const found = cooling || dialogOpen() ? null : resolve()
  if (!found) {
    hide()
    return
  }
  setAnchor(found.el)
  shown.value = found.tip
  const next = placeCoach(
    found.el.getBoundingClientRect(),
    bubbleSize(),
    viewport(),
    found.tip.placement ?? 'bottom',
    MARGIN,
  )
  if (!isSamePosition(next, position.value)) position.value = next
}

/** Coalesces the many events that can move a control into one measure per frame. */
function schedule() {
  if (frame) return
  frame = requestAnimationFrame(update)
}

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
  const target = event.target as HTMLElement | null
  if (
    target &&
    (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName))
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

const arrowStyle = computed(() => {
  const place = position.value
  if (!place) return {}
  return place.placement === 'top' || place.placement === 'bottom'
    ? { left: `${place.arrow}px` }
    : { top: `${place.arrow}px` }
})

// Re-resolve when the candidates change: a view switch, a dismissal, or new data.
watch(candidates, schedule)

// The bubble's own size is only known once it renders, so measure it then.
watch(
  bubble,
  (el) => {
    if (el) resizeObserver.observe(el)
    schedule()
  },
  { flush: 'post' },
)

// Lazily loaded views mount their controls later, so watch for new nodes too.
// Only the tip lookup runs on a change, which stays cheap.
const mutationObserver = new MutationObserver(() => schedule())

onMounted(() => {
  mutationObserver.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('scroll', schedule, { capture: true, passive: true })
  window.addEventListener('resize', schedule)
  window.addEventListener('keydown', onKeydown)
  schedule()
})

onUnmounted(() => {
  mutationObserver.disconnect()
  resizeObserver.disconnect()
  window.removeEventListener('scroll', schedule, { capture: true })
  window.removeEventListener('resize', schedule)
  window.removeEventListener('keydown', onKeydown)
  cancelAnimationFrame(frame)
  window.clearTimeout(coolTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="shown && position"
      ref="bubble"
      class="coach-mark"
      role="note"
      :aria-label="shown.title"
      :data-placement="position.placement"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      <span class="coach-mark__arrow" :style="arrowStyle" aria-hidden="true" />

      <div class="coach-mark__head">
        <strong class="coach-mark__title">{{ shown.title }}</strong>
        <button
          class="coach-mark__close"
          type="button"
          aria-label="Dismiss tip"
          @click="dismissShown"
        >
          <AppIcon name="close" :size="12" />
        </button>
      </div>

      <p class="coach-mark__body">{{ bodyText }}</p>

      <div class="coach-mark__actions">
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
      </div>
    </div>
  </Teleport>
</template>
