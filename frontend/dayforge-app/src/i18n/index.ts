/**
 * Interface translations. Each language has one JSON file per namespace in
 * `locales/<language>/<namespace>.json`; a file's keys are read as
 * `<namespace>.<key>`, so `sidebar.json` / `newProject` is `sidebar.newProject`.
 * Adding a file needs no change here, the glob picks it up.
 *
 * Plurals: `t('settings.summaryClients', n)` picks a form by count.
 * English, German and Spanish use two forms ("{n} task | {n} tasks"), English
 * may use three ("no tasks | {n} task | {n} tasks"), Chinese has one form.
 * Ukrainian and Polish need four, in this order (zero | one | few | many):
 *
 *   "Жодного завдання | {n} завдання | {n} завдання | {n} завдань"
 *    zero                one             few            many
 *
 * Index 0 is used for exactly 0; the rest follow the last digits of the count
 * (CLDR rules, see ukrainianForm and polishForm). The compat check in
 * tests/sync/compat/i18n.ts enforces the form counts.
 */
import { createI18n } from 'vue-i18n'
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  languageFromTag,
  type Language,
} from './languages'

export {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  PLURAL_FORMS,
  isLanguage,
  languageFromTag,
  type Language,
} from './languages'

type NamespaceFile = { default: Record<string, string> }

/** namespace -> key -> text, for one language. */
type Catalog = Record<string, Record<string, string>>

const LOCALE_FILE = /\/locales\/([^/]+)\/([^/]+)\.json$/

/** Message tree per language, nested as vue-i18n expects: `sidebar.newProject`. */
function buildMessages(): Record<Language, Catalog> {
  const messages = Object.fromEntries(
    LANGUAGES.map((language) => [language, {} as Catalog]),
  ) as Record<Language, Catalog>

  const files = import.meta.glob<NamespaceFile>('./locales/*/*.json', {
    eager: true,
  })
  for (const [path, file] of Object.entries(files)) {
    const match = LOCALE_FILE.exec(path)
    if (!match) continue
    const [, language, namespace] = match
    if (!LANGUAGES.includes(language as Language)) continue
    messages[language as Language][namespace] = file.default
  }
  return messages
}

// Zero, one, few, many: the same order the four-form messages use.
const ZERO = 0
const ONE = 1
const FEW = 2
const MANY = 3

/** Ukrainian: 1, 21, 31 are "one"; 2-4, 22-24 "few"; the rest "many". */
function ukrainianForm(count: number): number {
  const last = count % 10
  const lastTwo = count % 100
  if (last === 1 && lastTwo !== 11) return ONE
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return FEW
  return MANY
}

/** Polish: only 1 is "one"; 2-4 and 22-24 "few"; the rest "many". */
function polishForm(count: number): number {
  if (count === 1) return ONE
  const last = count % 10
  const lastTwo = count % 100
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return FEW
  return MANY
}

/** Wraps a CLDR rule so exactly 0 takes the zero form, then clamps to the message. */
function fourFormRule(form: (count: number) => number) {
  return (choice: number, choicesLength: number): number => {
    const count = Math.abs(choice)
    const index = count === 0 ? ZERO : form(count)
    return Math.min(index, choicesLength - 1)
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: languageFromTag(
    typeof navigator !== 'undefined' ? navigator.language : undefined,
  ),
  fallbackLocale: DEFAULT_LANGUAGE,
  messages: buildMessages(),
  globalInjection: true,
  pluralRules: {
    uk: fourFormRule(ukrainianForm),
    pl: fourFormRule(polishForm),
  },
})

/**
 * Switches the interface language and the document's `lang`, which screen
 * readers and hyphenation read. Components re-render on their own.
 */
export function setLanguage(language: Language) {
  i18n.global.locale.value = language
  document.documentElement.lang = language
}
