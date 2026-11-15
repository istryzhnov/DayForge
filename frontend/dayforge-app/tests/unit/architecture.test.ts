/**
 * The folder rules from README-structure.md, checked on the real import graph.
 * ESLint catches most of these while you type; this test also follows dynamic
 * import(), checks that features never depend on each other in a circle, and
 * that the tour listens from the start.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = resolve(__dirname, '../..')
const SRC = join(APP, 'src')
const FEATURES = join(SRC, 'features')

/** Every .ts and .vue file under a folder. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|vue)$/.test(entry.name) ? [path] : []
  })
}

interface ImportEdge {
  from: string
  to: string
  spec: string
  dynamic: boolean
}

const STATIC_IMPORT = /(?:^|\n)\s*(?:import|export)\s[^'"`;]*?from\s*'([^']+)'/g
const SIDE_EFFECT_IMPORT = /(?:^|\n)\s*import\s*'([^']+)'/g
const DYNAMIC_IMPORT = /\bimport\(\s*'([^']+)'\s*\)/g

function resolveSpec(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec)
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.vue`,
    join(base, 'index.ts'),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

const files = sourceFiles(SRC)
const unresolved: string[] = []
const edges: ImportEdge[] = files.flatMap((from) => {
  const code = readFileSync(from, 'utf8')
  const found: ImportEdge[] = []
  const collect = (pattern: RegExp, dynamic: boolean) => {
    for (const match of code.matchAll(pattern)) {
      const spec = match[1]
      if (!spec.startsWith('.')) continue
      const to = resolveSpec(from, spec)
      if (!to) {
        unresolved.push(`${rel(from)} -> ${spec}`)
        continue
      }
      // JSON catalogues and CSS are leaves; only code files form the graph.
      found.push({ from, to, spec, dynamic })
    }
  }
  collect(STATIC_IMPORT, false)
  collect(SIDE_EFFECT_IMPORT, false)
  collect(DYNAMIC_IMPORT, true)
  return found
})

function rel(path: string) {
  return relative(SRC, path).split(sep).join('/')
}

/** 'shared', 'features/tasks', 'pages', … for a file under src/. */
function layerOf(path: string): string {
  const parts = rel(path).split('/')
  if (parts[0] === 'features') return `features/${parts[1]}`
  return parts.length === 1 ? 'root' : parts[0]
}

const featureOf = (path: string) => {
  const layer = layerOf(path)
  return layer.startsWith('features/') ? layer.slice('features/'.length) : null
}

const featureNames = readdirSync(FEATURES, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

describe('folder layout', () => {
  it('has no catch-all src/components, src/composables or src/views folder', () => {
    expect(existsSync(join(SRC, 'components'))).toBe(false)
    expect(existsSync(join(SRC, 'views'))).toBe(false)
    expect(existsSync(join(SRC, 'composables'))).toBe(false)
  })

  it('resolves every relative import to a file', () => {
    expect(unresolved).toEqual([])
  })
})

describe('layer boundaries', () => {
  it('keeps the shared layers free of features and pages', () => {
    const lower = new Set(['shared', 'entities', 'sync', 'lib', 'i18n'])
    const offending = edges
      .filter((edge) => lower.has(layerOf(edge.from)))
      .filter((edge) => {
        const target = layerOf(edge.to)
        return target.startsWith('features/') || target === 'pages'
      })
      .map((edge) => `${rel(edge.from)} -> ${rel(edge.to)}`)
    expect(offending).toEqual([])
  })

  it('keeps features free of the page', () => {
    const offending = edges
      .filter((edge) => featureOf(edge.from) && layerOf(edge.to) === 'pages')
      .map((edge) => `${rel(edge.from)} -> ${rel(edge.to)}`)
    expect(offending).toEqual([])
  })

  it('lets a feature reach another feature only through its index.ts', () => {
    const offending = edges
      .filter((edge) => {
        const source = featureOf(edge.from)
        const target = featureOf(edge.to)
        return source && target && source !== target
      })
      .filter(
        (edge) => rel(edge.to) !== `features/${featureOf(edge.to)}/index.ts`,
      )
      .map(
        (edge) =>
          `${rel(edge.from)} -> ${rel(edge.to)}${edge.dynamic ? ' (dynamic)' : ''}`,
      )
    expect(offending).toEqual([])
  })

  it('has no circular dependencies between features', () => {
    const graph = new Map<string, Set<string>>(
      featureNames.map((name) => [name, new Set()]),
    )
    for (const edge of edges) {
      const source = featureOf(edge.from)
      const target = featureOf(edge.to)
      if (source && target && source !== target) graph.get(source)!.add(target)
    }

    const cycles: string[] = []
    const state = new Map<string, 'visiting' | 'done'>()
    const visit = (node: string, path: string[]) => {
      if (state.get(node) === 'done') return
      if (state.get(node) === 'visiting') {
        cycles.push([...path.slice(path.indexOf(node)), node].join(' -> '))
        return
      }
      state.set(node, 'visiting')
      for (const next of graph.get(node) ?? []) visit(next, [...path, node])
      state.set(node, 'done')
    }
    featureNames.forEach((name) => visit(name, []))

    expect(cycles).toEqual([])
  })
})

describe('feature public APIs', () => {
  const indexes = featureNames
    .map((name) => ({ name, path: join(FEATURES, name, 'index.ts') }))
    .filter(({ path }) => existsSync(path))

  it('only re-export from inside their own feature', () => {
    for (const { name, path } of indexes) {
      const statements = readFileSync(path, 'utf8')
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('//'))
        .join('\n')
        .split(/(?<=['"])\s*\n/)
      for (const statement of statements) {
        expect(statement, `${name}/index.ts`).toMatch(
          /^export (type )?\{[\s\S]+\} from '\.\/[^']+'$/,
        )
      }
    }
  })

  it('export only what another feature actually uses', () => {
    const usedNames = new Map<string, Set<string>>()
    for (const edge of edges) {
      const source = featureOf(edge.from)
      const target = featureOf(edge.to)
      if (!source || !target || source === target) continue
      const code = readFileSync(edge.from, 'utf8')
      const names = usedNames.get(target) ?? new Set<string>()
      const quoted = edge.spec.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
      const pattern = new RegExp(
        `import\\s+(?:type\\s+)?\\{([^}]*)\\}\\s*from\\s*'${quoted}'`,
        'g',
      )
      for (const match of code.matchAll(pattern)) {
        match[1]
          .split(',')
          .map((part) =>
            part
              .replace(/^\s*type\s+/, '')
              .split(/\s+as\s+/)[0]
              .trim(),
          )
          .filter(Boolean)
          .forEach((part) => names.add(part))
      }
      // `import('../../board').then((board) => board.ProjectBoard)`
      for (const match of code.matchAll(
        new RegExp(
          `import\\('${quoted}'\\)\\.then\\(\\((\\w+)\\) => \\1\\.(\\w+)\\)`,
          'g',
        ),
      )) {
        names.add(match[2])
      }
      usedNames.set(target, names)
    }

    for (const { name, path } of indexes) {
      const exported = [
        ...readFileSync(path, 'utf8').matchAll(/export (?:type )?\{([^}]*)\}/g),
      ].flatMap((match) =>
        match[1]
          .split(',')
          .map((part) =>
            part
              .split(/\s+as\s+/)
              .pop()!
              .trim(),
          )
          .filter(Boolean),
      )
      const unused = exported.filter((item) => !usedNames.get(name)?.has(item))
      expect(unused, `${name}/index.ts exports nobody imports`).toEqual([])
    }
  })

  it('load without undefined exports (no import cycle leaves a gap)', async () => {
    for (const { name } of indexes) {
      const api: Record<string, unknown> = await import(
        `../../src/features/${name}/index.ts`
      )
      for (const [key, value] of Object.entries(api)) {
        expect(value, `${name}.${key}`).toBeDefined()
      }
    }
  })
})

describe('startup wiring', () => {
  it('loads the tour with the first chunk, so it hears every user action', () => {
    // Only static imports: a lazily loaded tour could miss actions that happen
    // before its chunk arrives.
    const staticGraph = new Map<string, string[]>()
    for (const edge of edges) {
      if (edge.dynamic) continue
      const list = staticGraph.get(edge.from) ?? []
      list.push(edge.to)
      staticGraph.set(edge.from, list)
    }
    const reached = new Set<string>()
    const queue = [join(SRC, 'main.ts')]
    while (queue.length) {
      const file = queue.pop()!
      if (reached.has(file)) continue
      reached.add(file)
      queue.push(...(staticGraph.get(file) ?? []))
    }
    expect(
      reached.has(join(FEATURES, 'onboarding/composables/useTour.ts')),
    ).toBe(true)
    // Control: a view MainPage loads on demand must not count as startup code,
    // or the check above would pass for a lazily loaded tour too.
    expect(
      reached.has(join(FEATURES, 'analytics/components/AnalyticsView.vue')),
    ).toBe(false)
  })
})
