import { computed, ref, watch, type Ref } from 'vue'
import { useAuth } from '../../../composables/useAuth'
import { useSettings, type StartView } from '../../../composables/useSettings'
import { GOAL_COLOR_PRESETS } from '../../../entities/constants'

/**
 * Sign-in leaves the app for Google and comes back to it, so the choice made
 * before leaving is kept here. sessionStorage, because it only means something
 * within the same tab.
 */
const PENDING_KEY = 'dayforge-welcome-pending'

export type WelcomeStep = 1 | 2 | 3
export type AccountChoice = 'signin' | 'signup' | 'local'
export type UseChoice = 'plan' | 'track' | 'freelance'

/** Whether the card is on screen. */
export const welcomeOpen = ref(false)

/**
 * Coach marks wait while this is set: from page load until the card has decided
 * whether to open, and for as long as it is open. Otherwise a new user would
 * see a tip flash before the card covers the page.
 */
export const welcomeHoldsTips = ref(true)

/** Step the card opens on: 2 when a sign-up came back signed in. */
export const welcomeStartStep = ref<WelcomeStep>(1)

/** What each answer on step 2 sets the start page to. */
export const USE_OPTIONS: ReadonlyArray<{
  value: UseChoice
  label: string
  hint: string
  icon: 'calendar' | 'timer' | 'chart'
  view: StartView
}> = [
  {
    value: 'plan',
    label: 'Plan my day',
    hint: 'Tasks, projects and a calendar for the day.',
    icon: 'calendar',
    view: 'goals',
  },
  {
    value: 'track',
    label: 'Track my time',
    hint: 'A timer for focus, with pomodoro breaks.',
    icon: 'timer',
    view: 'timer',
  },
  {
    value: 'freelance',
    label: 'Freelance work',
    hint: 'Hours, rates and what each client owes.',
    icon: 'chart',
    view: 'analytics',
  },
]

function readPending(): 'signin' | 'signup' | null {
  try {
    const value = sessionStorage.getItem(PENDING_KEY)
    sessionStorage.removeItem(PENDING_KEY)
    return value === 'signin' || value === 'signup' ? value : null
  } catch {
    // Private windows can refuse storage; then the card just starts fresh.
    return null
  }
}

function savePending(choice: 'signin' | 'signup') {
  try {
    sessionStorage.setItem(PENDING_KEY, choice)
  } catch {
    // Without it, a return from Google lands on step 1 again, which is harmless.
  }
}

function clearPending() {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // Nothing was stored, so there is nothing to clear.
  }
}

/** Finishing for any reason, so the card never returns on this or another device. */
function markDone() {
  const { update } = useSettings()
  update('behavior', { welcomeDone: true })
  welcomeOpen.value = false
  welcomeHoldsTips.value = false
}

/**
 * Decides once, after the stored data has loaded and auth has settled, whether
 * the card opens. Only a brand-new user (no projects, no task templates) who has
 * not finished it sees it. A flow already under way from a sign-in redirect is
 * continued, whatever the data says, because the user just started it.
 */
export function useWelcomeStart(
  isFirstRun: Readonly<Ref<boolean>>,
  dataReady: Readonly<Ref<boolean>>,
) {
  const auth = useAuth()
  const { settings } = useSettings()

  let decided = false
  watch(
    () => dataReady.value && auth.isReady.value,
    (ready) => {
      if (!ready || decided) return
      decided = true
      decide()
    },
    { immediate: true },
  )

  function open(step: WelcomeStep) {
    welcomeStartStep.value = step
    welcomeOpen.value = true
    welcomeHoldsTips.value = true
  }

  function decide() {
    const pending = readPending()
    const signedIn = auth.user.value !== null

    if (settings.behavior.welcomeDone) {
      clearPending()
      welcomeHoldsTips.value = false
      return
    }

    // Back from Google with an account: a sign-in is done, a sign-up goes on.
    if (pending && signedIn) {
      if (pending === 'signin') {
        markDone()
        return
      }
      open(2)
      return
    }

    // Cancelled or refused: show step 1 again, with the error from auth. An
    // account already signed in is not new, even before its data arrives.
    if (pending || (isFirstRun.value && !signedIn)) {
      open(1)
      return
    }

    welcomeHoldsTips.value = false
  }
}

interface WelcomeCallbacks {
  selectView: (view: StartView) => void
  createProject: (title: string, color: string, select: boolean) => void
  useTemplate: () => void
}

/** Step state and actions of the card. Created each time the card opens. */
export function useWelcome(callbacks: WelcomeCallbacks) {
  const auth = useAuth()
  const { update } = useSettings()

  const step = ref<WelcomeStep>(welcomeStartStep.value)
  const account = ref<AccountChoice | null>(null)
  const useChoice = ref<UseChoice | null>(null)
  const projectName = ref('')
  const projectColor = ref<string>(GOAL_COLOR_PRESETS[0])

  const canContinue = computed(() =>
    step.value === 1 ? account.value !== null : useChoice.value !== null,
  )

  const canCreate = computed(() => projectName.value.trim() !== '')

  function back() {
    if (step.value > 1) step.value = (step.value - 1) as WelcomeStep
  }

  /** Applies the step 2 answer as the start page, and shows that page now. */
  function applyUse(choice: UseChoice) {
    const option = USE_OPTIONS.find((item) => item.value === choice)
    if (!option) return
    update('behavior', {
      startView: option.view,
      startGoalId: null,
    })
    callbacks.selectView(option.view)
  }

  /** Google takes the page away, so the choice is saved before the redirect. */
  async function continueStep() {
    if (step.value === 1) {
      if (!account.value || auth.isBusy.value) return
      if (account.value === 'local') {
        step.value = 2
        return
      }
      savePending(account.value)
      const started = await auth.signInWithGoogle()
      // A refused start keeps the card here, with the error shown.
      if (!started) clearPending()
      return
    }

    if (step.value === 2) {
      if (!useChoice.value) return
      applyUse(useChoice.value)
      step.value = 3
    }
  }

  function createProject() {
    const title = projectName.value.trim()
    if (!title) return
    callbacks.createProject(
      title,
      projectColor.value,
      useChoice.value === 'plan',
    )
    markDone()
  }

  function useTemplate() {
    markDone()
    callbacks.useTemplate()
  }

  return {
    step,
    account,
    useChoice,
    projectName,
    projectColor,
    canContinue,
    canCreate,
    error: auth.error,
    isBusy: auth.isBusy,
    continueStep,
    back,
    skip: markDone,
    createProject,
    useTemplate,
    dismissError: auth.dismissError,
  }
}
