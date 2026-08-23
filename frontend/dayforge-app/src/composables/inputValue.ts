/**
 * Reading a value out of a DOM event, once, instead of in every settings
 * template. Pure helpers — no state, no Vue.
 *
 * These exist because a settings panel is mostly native inputs, and
 * `(event.target as HTMLInputElement).value` inline in a template is both
 * unreadable and untyped.
 */

export function rangeValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value)
}

/** A range whose stored value is a 0–1 fraction shown as a percentage. */
export function fractionValue(event: Event): number {
  return rangeValue(event) / 100
}

export function checkedValue(event: Event): boolean {
  return (event.target as HTMLInputElement).checked
}

export function textValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value
}

/** Bound as a helper rather than an inline object, which vue-tsc reports as a
 *  CSSProperties mismatch. */
export function swatchStyle(color: string) {
  return { backgroundColor: color }
}
