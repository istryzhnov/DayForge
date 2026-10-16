/**
 * Case- and diacritic-insensitive matching that keeps track of where each
 * folded character came from, so a match can be highlighted in the original.
 */

export type TextSegment = { text: string; match: boolean }

type Folded = {
  norm: string
  /** For each char of `norm`: where its source code point starts and ends. */
  starts: number[]
  ends: number[]
}

const COMBINING_MARKS = /\p{M}/gu

function foldFragment(fragment: string): string {
  return fragment.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase()
}

function foldWithMap(text: string): Folded {
  let norm = ''
  const starts: number[] = []
  const ends: number[] = []

  let offset = 0
  for (const char of text) {
    const folded = foldFragment(char)
    const start = offset
    offset += char.length
    for (let i = 0; i < folded.length; i += 1) {
      norm += folded[i]
      starts.push(start)
      ends.push(offset)
    }
  }

  return { norm, starts, ends }
}

/** Folded form used for comparisons: NFD, no marks, lower case. */
export function foldText(text: string): string {
  return foldWithMap(text).norm
}

/** Trimmed and folded query, or '' when there is nothing to search for. */
export function foldQuery(query: string): string {
  return foldText(query.replace(/\s+/g, ' ').trim())
}

/** Original-text ranges of every non-overlapping match of `needle`. */
export function findMatchRanges(
  text: string,
  needle: string,
): Array<[number, number]> {
  if (!needle) return []

  const folded = foldWithMap(text)
  const ranges: Array<[number, number]> = []
  let from = 0

  while (from <= folded.norm.length) {
    const at = folded.norm.indexOf(needle, from)
    if (at === -1) break
    const last = at + needle.length - 1
    ranges.push([folded.starts[at], folded.ends[last]])
    from = last + 1
  }

  return ranges
}

/** Splits text into plain and matched runs, ready for `<mark>` rendering. */
export function highlightSegments(text: string, needle: string): TextSegment[] {
  const ranges = findMatchRanges(text, needle)
  if (ranges.length === 0) return text ? [{ text, match: false }] : []

  const segments: TextSegment[] = []
  let cursor = 0
  ranges.forEach(([start, end]) => {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), match: false })
    }
    segments.push({ text: text.slice(start, end), match: true })
    cursor = end
  })
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false })
  }
  return segments
}

const SNIPPET_BEFORE = 28
const SNIPPET_AFTER = 52

/**
 * A short window of `text` around its first match, with the match marked.
 * Line breaks are flattened so the snippet stays on one line.
 */
export function snippetSegments(text: string, needle: string): TextSegment[] {
  const flat = text.replace(/\s+/g, ' ')
  const [first] = findMatchRanges(flat, needle)
  if (!first) return []

  let start = Math.max(0, first[0] - SNIPPET_BEFORE)
  let end = Math.min(flat.length, first[1] + SNIPPET_AFTER)

  // Never cut a surrogate pair in half.
  if (start > 0 && isLowSurrogate(flat.charCodeAt(start))) start += 1
  if (end < flat.length && isLowSurrogate(flat.charCodeAt(end))) end += 1

  const body = highlightSegments(flat.slice(start, end), needle)
  const segments: TextSegment[] = []
  if (start > 0) segments.push({ text: '…', match: false })
  segments.push(...body)
  if (end < flat.length) segments.push({ text: '…', match: false })
  return segments
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff
}
