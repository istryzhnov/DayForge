/**
 * The languages the interface ships in. Kept apart from the Vue-facing setup
 * in index.ts so settings and the compat checks can use the list without
 * loading the message bundle.
 */

export const LANGUAGES = ['en', 'uk', 'pl', 'de', 'zh', 'es'] as const

export type Language = (typeof LANGUAGES)[number]

/** Source language and the fallback for any key a translation lacks. */
export const DEFAULT_LANGUAGE: Language = 'en'

/**
 * Plural forms a language needs, where that differs from English: Ukrainian
 * and Polish have four (zero | one | few | many), Chinese has one (no plural
 * inflection). Every other language uses as many forms as its English
 * message, so the completeness check compares against English.
 */
export const PLURAL_FORMS: Partial<Record<Language, number>> = {
  uk: 4,
  pl: 4,
  zh: 1,
}

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language)
}

/**
 * The first two letters of a browser tag such as `uk-UA`, if the app ships
 * that language. Anything else falls back to English.
 */
export function languageFromTag(tag: string | undefined): Language {
  const code = (tag ?? '').slice(0, 2).toLowerCase()
  return isLanguage(code) ? code : DEFAULT_LANGUAGE
}
