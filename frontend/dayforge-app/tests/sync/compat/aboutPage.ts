/**
 * About page: public/about-i18n.js carries the same keys for every translated
 * language, covers every language the app ships, and every data-i18n key used
 * in public/about.html has a translation in each of them.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { LANGUAGES } from '../../../src/i18n/languages'
import { check, section } from './harness'

/** npm runs verify:sync from the app folder, so the public files sit at a fixed path. */
const PUBLIC_DIR = join(process.cwd(), 'public')

/** Every language except English, which is the text already in about.html. */
const TRANSLATED = LANGUAGES.filter((language) => language !== 'en')

type Dictionary = Record<string, string>

type AboutApi = {
  SUPPORTED: string[]
  DICT: Record<string, Dictionary>
}

/** Every key the page names in data-i18n, data-i18n-html or data-i18n-attr. */
function keysUsedBy(html: string): string[] {
  const keys = new Set<string>()
  for (const match of html.matchAll(/\sdata-i18n(?:-html)?="([^"]+)"/g)) {
    keys.add(match[1])
  }
  for (const match of html.matchAll(/\sdata-i18n-attr="([^"]+)"/g)) {
    for (const pair of match[1].split(',')) {
      const key = pair.slice(pair.indexOf(':') + 1)
      if (key) keys.add(key)
    }
  }
  return [...keys].sort()
}

/** Runs the browser script in an empty context (no document) and returns its API. */
function loadApi(): AboutApi | undefined {
  const sandbox: { window: { DayForgeAbout?: AboutApi } } = { window: {} }
  runInNewContext(
    readFileSync(join(PUBLIC_DIR, 'about-i18n.js'), 'utf8'),
    sandbox,
  )
  return sandbox.window.DayForgeAbout
}

export function verifyAboutPage() {
  section('About page: every language covers every key used in about.html')

  const html = readFileSync(join(PUBLIC_DIR, 'about.html'), 'utf8')
  const used = keysUsedBy(html)
  check('about.html names at least one translatable key', used.length > 0)

  const api = loadApi()
  check('about-i18n.js loads and exposes its dictionary', api !== undefined)
  if (!api) return

  check(
    'about-i18n.js supports exactly the app languages',
    api.SUPPORTED.join(',') === LANGUAGES.join(','),
    { expected: LANGUAGES, found: api.SUPPORTED },
  )

  const dictionaryLanguages = Object.keys(api.DICT).sort()
  check(
    'dictionary holds every language except English',
    dictionaryLanguages.join(',') === [...TRANSLATED].sort().join(','),
    { expected: TRANSLATED, found: dictionaryLanguages },
  )

  const reference = Object.keys(api.DICT[TRANSLATED[0]] ?? {}).sort()
  for (const language of TRANSLATED) {
    const dictionary = api.DICT[language] ?? {}
    const keys = Object.keys(dictionary).sort()

    check(
      `${language}: same keys as ${TRANSLATED[0]}`,
      keys.join(',') === reference.join(','),
      {
        missing: reference.filter((key) => !keys.includes(key)),
        extra: keys.filter((key) => !reference.includes(key)),
      },
    )

    const untranslated = used.filter(
      (key) => !Object.prototype.hasOwnProperty.call(dictionary, key),
    )
    check(
      `${language}: every key used by about.html is translated`,
      untranslated.length === 0,
      untranslated,
    )

    const unused = keys.filter((key) => !used.includes(key))
    check(
      `${language}: no translation unused by about.html`,
      unused.length === 0,
      unused,
    )

    const empty = keys.filter((key) => dictionary[key].trim() === '')
    check(`${language}: no empty translation`, empty.length === 0, empty)
  }
}
