
export type TimeSpan = {
  id: string
  startMin: number
  endMin: number
}

export type OverlapSlot = {
  /** Fraction of the strip's width where the block starts, 0–1. */
  left: number
  /** Fraction of the strip's width the block occupies, 0–1. */
  width: number
  /** How many columns the cluster was split into; 1 means no overlap at all. */
  columns: number
}

/** Touching edges don't count: 09:00–10:00 and 10:00–11:00 are not an overlap. */
function overlaps(a: TimeSpan, b: TimeSpan): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin
}

export function layoutOverlaps(spans: TimeSpan[]): Map<string, OverlapSlot> {
  const slots = new Map<string, OverlapSlot>()
  if (spans.length === 0) return slots

  // Earliest first; the longer block wins a tie so it takes the left column.
  const ordered = [...spans].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - a.endMin,
  )

  let cluster: TimeSpan[] = []
  let clusterEnd = -1

  const flush = () => {
    if (cluster.length) placeCluster(cluster, slots)
    cluster = []
    clusterEnd = -1
  }

  for (const span of ordered) {
    // A block starting at or after everything seen so far begins a new cluster.
    if (cluster.length && span.startMin >= clusterEnd) flush()
    cluster.push(span)
    clusterEnd = Math.max(clusterEnd, span.endMin)
  }
  flush()

  return slots
}

function placeCluster(cluster: TimeSpan[], slots: Map<string, OverlapSlot>) {
  const columns: TimeSpan[][] = []
  const columnOf = new Map<string, number>()

  for (const span of cluster) {
    let index = columns.findIndex(
      (column) => !column.some((placed) => overlaps(placed, span)),
    )
    if (index === -1) {
      columns.push([])
      index = columns.length - 1
    }
    columns[index].push(span)
    columnOf.set(span.id, index)
  }

  const total = columns.length

  for (const span of cluster) {
    const start = columnOf.get(span.id) ?? 0
    let reach = 1
    for (let next = start + 1; next < total; next += 1) {
      if (columns[next].some((placed) => overlaps(placed, span))) break
      reach += 1
    }

    slots.set(span.id, {
      left: start / total,
      width: reach / total,
      columns: total,
    })
  }
}
