/**
 * Pure colour maths shared by the appearance panel and the per-project themes.
 *
 * Everything here works on plain CSS colour strings so results can be written
 * straight into custom properties. Only formats that actually appear in
 * `layout.css` need parsing: hex and `rgb()`/`rgba()`.
 */

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Hsl {
  h: number
  s: number
  l: number
}

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i
const RGB_FUNC = /^rgba?\(([^)]+)\)$/i

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function parseColor(input: string | undefined | null): Rgb | null {
  if (!input) return null
  const value = input.trim()

  const short = HEX_SHORT.exec(value)
  if (short) {
    return {
      r: parseInt(short[1] + short[1], 16),
      g: parseInt(short[2] + short[2], 16),
      b: parseInt(short[3] + short[3], 16),
    }
  }

  const long = HEX_LONG.exec(value)
  if (long) {
    return {
      r: parseInt(long[1], 16),
      g: parseInt(long[2], 16),
      b: parseInt(long[3], 16),
    }
  }

  const func = RGB_FUNC.exec(value)
  if (func) {
    const parts = func[1]
      .split(/[,/\s]+/)
      .filter(Boolean)
      .map((part) => Number.parseFloat(part))
    if (parts.length >= 3 && parts.every((part) => Number.isFinite(part))) {
      return { r: parts[0], g: parts[1], b: parts[2] }
    }
  }

  return null
}

/** True when a string is something the colour maths below can work with. */
export function isColor(input: string | undefined | null): boolean {
  return parseColor(input) !== null
}

export function toHex(rgb: Rgb): string {
  const channel = (value: number) =>
    Math.round(clamp(value, 0, 255))
      .toString(16)
      .padStart(2, '0')
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`
}

/** Normalises any supported input to `#rrggbb`, or returns the fallback. */
export function normalizeHex(input: string | undefined, fallback = '#000000'): string {
  const rgb = parseColor(input)
  return rgb ? toHex(rgb) : fallback
}

export function rgbToHsl(rgb: Rgb): Hsl {
  const r = clamp(rgb.r, 0, 255) / 255
  const g = clamp(rgb.g, 0, 255) / 255
  const b = clamp(rgb.b, 0, 255) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) return { h: 0, s: 0, l: l * 100 }

  const s = delta / (1 - Math.abs(2 * l - 1))

  let h: number
  if (max === r) h = ((g - b) / delta) % 6
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4

  h *= 60
  if (h < 0) h += 360

  return { h, s: s * 100, l: l * 100 }
}

export function hslToRgb(hsl: Hsl): Rgb {
  const h = ((hsl.h % 360) + 360) % 360
  const s = clamp(hsl.s, 0, 100) / 100
  const l = clamp(hsl.l, 0, 100) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let rgb: [number, number, number]
  if (h < 60) rgb = [c, x, 0]
  else if (h < 120) rgb = [x, c, 0]
  else if (h < 180) rgb = [0, c, x]
  else if (h < 240) rgb = [0, x, c]
  else if (h < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]

  return {
    r: (rgb[0] + m) * 255,
    g: (rgb[1] + m) * 255,
    b: (rgb[2] + m) * 255,
  }
}

export function toHsl(input: string): Hsl {
  return rgbToHsl(parseColor(input) ?? { r: 0, g: 0, b: 0 })
}

export function fromHsl(hsl: Hsl): string {
  return toHex(hslToRgb(hsl))
}

/** `ratio` is how much of `a` survives: 1 keeps `a`, 0 returns `b`. */
export function mix(a: string, b: string, ratio: number): string {
  const first = parseColor(a)
  const second = parseColor(b)
  if (!first || !second) return normalizeHex(a, normalizeHex(b))

  const weight = clamp(ratio, 0, 1)
  return toHex({
    r: first.r * weight + second.r * (1 - weight),
    g: first.g * weight + second.g * (1 - weight),
    b: first.b * weight + second.b * (1 - weight),
  })
}

export function withAlpha(color: string, alpha: number): string {
  const rgb = parseColor(color)
  if (!rgb) return color
  const round = (value: number) => Math.round(clamp(value, 0, 255))
  return `rgba(${round(rgb.r)}, ${round(rgb.g)}, ${round(rgb.b)}, ${Number(
    clamp(alpha, 0, 1).toFixed(3),
  )})`
}

export function lighten(color: string, amount: number): string {
  const hsl = toHsl(color)
  return fromHsl({ ...hsl, l: clamp(hsl.l + amount, 0, 100) })
}

export function darken(color: string, amount: number): string {
  return lighten(color, -amount)
}

export function saturate(color: string, amount: number): string {
  const hsl = toHsl(color)
  return fromHsl({ ...hsl, s: clamp(hsl.s + amount, 0, 100) })
}

export function rotateHue(color: string, degrees: number): string {
  const hsl = toHsl(color)
  return fromHsl({ ...hsl, h: hsl.h + degrees })
}

export function relativeLuminance(color: string): number {
  const rgb = parseColor(color)
  if (!rgb) return 0

  const channel = (value: number) => {
    const v = clamp(value, 0, 255) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }

  return (
    0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
  )
}

export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  const light = Math.max(first, second)
  const dark = Math.min(first, second)
  return (light + 0.05) / (dark + 0.05)
}

export function isLight(color: string): boolean {
  return relativeLuminance(color) > 0.42
}

/**
 * Text that stays readable on a filled surface — the check mark inside a
 * completed circle, the label on a calendar block.
 */
export function readableTextOn(color: string): string {
  const dark = mix(color, '#000000', 0.14)
  const light = mix(color, '#ffffff', 0.06)
  return contrastRatio(color, dark) >= contrastRatio(color, light) ? dark : light
}
