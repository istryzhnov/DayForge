import { ref } from 'vue'
import { readJson, writeJson } from '../../../lib/storage'
import { TIPS, type TipFacts } from './tips'

const TIPS_STORAGE_KEY = 'dayforge-coach-tips-v1'
/**
 * Where these tips used to live. The keyboard-shortcut toast writes the same
 * key with its own fields and wiped "off" and the dismissed list on every
 * load, so the tips moved out; what was saved there is read once.
 */
const SHARED_STORAGE_KEY = 'dayforge-tips-v1'

interface StoredTips {
  dismissed: string[]
  off: boolean
}

/** A damaged value just brings every tip back, which is harmless. */
function loadStored(): StoredTips {
  const stored =
    readJson<Partial<StoredTips> | null>(TIPS_STORAGE_KEY, null) ??
    readJson<Partial<StoredTips>>(SHARED_STORAGE_KEY, {})
  return {
    dismissed: Array.isArray(stored.dismissed)
      ? stored.dismissed.filter((id) => typeof id === 'string')
      : [],
    off: stored.off === true,
  }
}

const initial = loadStored()
const dismissed = ref<string[]>(initial.dismissed)
const tipsOff = ref(initial.off)
const facts = ref<TipFacts>({ taskCount: 0, projectCount: 0, inProject: false })

function save() {
  writeJson(TIPS_STORAGE_KEY, {
    dismissed: dismissed.value,
    off: tipsOff.value,
  })
}

function isVisible(id: string): boolean {
  if (tipsOff.value || dismissed.value.includes(id)) return false
  const tip = TIPS.find((item) => item.id === id)
  if (!tip) return false
  return tip.when ? tip.when(facts.value) : true
}

/** Lets the tips read the current data without knowing about the stores. */
export function setTipFacts(next: TipFacts) {
  facts.value = next
}

export function useTips() {
  function dismiss(id: string) {
    if (dismissed.value.includes(id)) return
    dismissed.value = [...dismissed.value, id]
    save()
  }

  function turnOff() {
    tipsOff.value = true
    save()
  }

  function turnOn() {
    tipsOff.value = false
    save()
  }

  /** Brings every dismissed tip back and turns tips on again. */
  function resetTips() {
    dismissed.value = []
    tipsOff.value = false
    save()
  }

  return {
    tipsOff,
    isVisible,
    dismiss,
    turnOff,
    turnOn,
    resetTips,
  }
}
