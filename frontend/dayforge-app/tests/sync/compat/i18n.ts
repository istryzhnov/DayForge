/**
 * Compat checks: every language carries the same messages as English, with the
 * same placeholders and plural forms, and no message is left empty.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  LANGUAGES,
  PLURAL_FORMS,
  type Language,
} from '../../../src/i18n/languages'
import { check, section } from './harness'

/** npm runs verify:sync from the app folder, so the locale files sit at a fixed path. */
const LOCALES_DIR = join(process.cwd(), 'src', 'i18n', 'locales')

const SOURCE: Language = 'en'

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g

/** namespace -> key -> message, for one language. */
type Catalog = Record<string, Record<string, string>>

function loadCatalog(language: Language): Catalog {
  const dir = join(LOCALES_DIR, language)
  const catalog: Catalog = {}
  if (!existsSync(dir)) return catalog
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    const namespace = file.slice(0, -'.json'.length)
    catalog[namespace] = JSON.parse(
      readFileSync(join(dir, file), 'utf8'),
    ) as Record<string, string>
  }
  return catalog
}

function placeholdersOf(message: string): string[] {
  const names = [...message.matchAll(PLACEHOLDER)].map((match) => match[1])
  return [...new Set(names)].sort()
}

/** Plural messages are written as `one | other`; each `|` part is one form. */
function formsOf(message: string): number {
  return message.split('|').length
}

/** English is the reference; Ukrainian and Polish override the form count. */
function expectedForms(language: Language, englishMessage: string): number {
  if (!englishMessage.includes('|')) return 1
  return PLURAL_FORMS[language] ?? formsOf(englishMessage)
}

export function verifyTranslations() {
  section('Every language matches English: keys, placeholders, plural forms')

  const english = loadCatalog(SOURCE)
  const namespaces = Object.keys(english).sort()

  for (const language of LANGUAGES) {
    const catalog = language === SOURCE ? english : loadCatalog(language)
    const foundNamespaces = Object.keys(catalog).sort()
    check(
      `${language}: namespaces match en`,
      foundNamespaces.join(',') === namespaces.join(','),
      { expected: namespaces, found: foundNamespaces },
    )

    for (const namespace of namespaces) {
      const source = english[namespace]
      const target = catalog[namespace] ?? {}
      const label = `${language} ${namespace}`

      const missing = Object.keys(source).filter((key) => !(key in target))
      const extra = Object.keys(target).filter((key) => !(key in source))
      check(`${label}: no missing keys`, missing.length === 0, missing)
      check(`${label}: no extra keys`, extra.length === 0, extra)

      const empty = Object.keys(source).filter(
        (key) =>
          key in target &&
          (typeof target[key] !== 'string' || target[key].trim() === ''),
      )
      check(`${label}: no empty messages`, empty.length === 0, empty)

      const placeholderMismatch: unknown[] = []
      const formMismatch: unknown[] = []
      for (const key of Object.keys(source)) {
        if (!(key in target) || typeof target[key] !== 'string') continue
        const message = target[key]
        const englishMessage = source[key]

        if (
          placeholdersOf(message).join(',') !==
          placeholdersOf(englishMessage).join(',')
        ) {
          placeholderMismatch.push({
            key,
            expected: placeholdersOf(englishMessage),
            found: placeholdersOf(message),
          })
        }

        const wanted = expectedForms(language, englishMessage)
        if (formsOf(message) !== wanted) {
          formMismatch.push({ key, expected: wanted, found: formsOf(message) })
        }
      }
      check(
        `${label}: placeholders match en`,
        placeholderMismatch.length === 0,
        placeholderMismatch,
      )
      check(
        `${label}: plural form count`,
        formMismatch.length === 0,
        formMismatch,
      )
    }
  }
}
