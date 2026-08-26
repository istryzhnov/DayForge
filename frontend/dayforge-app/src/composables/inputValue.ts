
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

export function swatchStyle(color: string) {
  return { backgroundColor: color }
}
