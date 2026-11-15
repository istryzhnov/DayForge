/**
 * Mounts the whole app and visits every screen. Each screen past the first is
 * loaded on demand from its feature, so a broken import path, a feature index
 * that resolves to undefined, or a component that fails to render shows up
 * here as a Vue warning or error, both of which fail the test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { App } from 'vue'

let app: App | null = null
const problems: string[] = []

/** Lets lazy chunks resolve and Vue re-render, the way the browser would. */
async function settle(rounds = 20) {
  const { nextTick } = await import('vue')
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await nextTick()
  }
}

/**
 * Waits until the selector matches, letting lazy chunks load in between.
 * Fails with the problems seen so far if it never appears.
 */
async function waitFor(selector: string, timeoutMs = 5000): Promise<Element> {
  const started = Date.now()
  for (;;) {
    const element = document.querySelector(selector)
    if (element) return element
    if (Date.now() - started > timeoutMs) {
      throw new Error(
        `"${selector}" never appeared. Problems: ${JSON.stringify(problems)}`,
      )
    }
    await settle(1)
  }
}

async function mountApp() {
  document.body.innerHTML = '<div id="app"></div>'
  const { createApp } = await import('vue')
  const { i18n } = await import('../../src/i18n')
  const Root = (await import('../../src/App.vue')).default
  app = createApp(Root)
  app.config.warnHandler = (message) => problems.push(`warn: ${message}`)
  app.config.errorHandler = (error) => problems.push(`error: ${String(error)}`)
  app.use(i18n)
  app.mount('#app')
  await settle()
}

function click(selector: string) {
  const element = document.querySelector<HTMLElement>(selector)
  expect(element, selector).not.toBeNull()
  element!.click()
}

/** The sidebar button for a screen. Archive has no tip anchor, so it goes by its label. */
function navButton(view: string): HTMLElement | null {
  if (view !== 'archive') {
    return document.querySelector(`[data-tip-anchor="nav-${view}"]`)
  }
  return (
    [...document.querySelectorAll<HTMLElement>('.nav-goal-btn')].find(
      (button) => button.textContent?.includes('What I did'),
    ) ?? null
  )
}

beforeEach(() => {
  localStorage.clear()
  problems.length = 0
  vi.resetModules()
})

afterEach(() => {
  app?.unmount()
  app = null
})

describe('app smoke test', () => {
  it('opens on the goals screen with the sidebar and the welcome card', async () => {
    await mountApp()

    expect(
      document.querySelector('[data-tip-anchor="nav-timer"]'),
    ).not.toBeNull()
    expect(document.body.textContent).toContain('DayForge')
    expect(problems).toEqual([])
  })

  // Each screen's own root element, so the test waits for the lazy chunk to
  // load and render instead of passing on the empty placeholder.
  it.each([
    ['calendar', '.calendar-view'],
    ['timer', '.timer-view'],
    ['analytics', 'section.analytics'],
    ['planned', '[data-tip-anchor="planned-header"]'],
    ['archive', '[data-tip-anchor="archive-header"]'],
  ])('opens the %s screen from the sidebar', async (view, root) => {
    await mountApp()
    expect(document.querySelector(root)).toBeNull()

    const button = navButton(view)
    expect(button, view).not.toBeNull()
    button!.click()
    await waitFor(root)
    await settle()

    expect(navButton(view)?.classList.contains('active')).toBe(true)
    expect(problems).toEqual([])
  })

  it('opens and closes the settings panel', async () => {
    await mountApp()

    click('.sidebar-settings__trigger')
    await waitFor('.settings-panel')
    await settle()
    expect(
      document
        .querySelector('.sidebar-settings__trigger')
        ?.classList.contains('is-active'),
    ).toBe(true)

    click('.sidebar-settings__trigger')
    await settle()
    expect(
      document
        .querySelector('.sidebar-settings__trigger')
        ?.classList.contains('is-active'),
    ).toBe(false)
    expect(document.querySelector('.settings-panel')).toBeNull()
    expect(problems).toEqual([])
  })
})
