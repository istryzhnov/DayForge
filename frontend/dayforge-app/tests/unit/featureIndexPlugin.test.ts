// @vitest-environment node
/**
 * Feature index files re-export a feature's public pieces. Without help the
 * bundler keeps every re-exported module that might have side effects, so one
 * import from a feature drags the rest into the first chunk. These tests build
 * a tiny project with the real bundler to prove the plugin prevents that.
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { build, type Rollup } from 'vite'
import { featureIndexWithoutSideEffects } from '../../vite.config'

const root = mkdtempSync(join(tmpdir(), 'feature-index-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

function write(path: string, code: string) {
  const full = join(root, path)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, code)
}

// A feature with two public pieces; the second announces itself when loaded,
// the way a component module registers styles or a store.
write('src/features/demo/used.ts', `export const used = 'USED_PIECE'\n`)
write(
  'src/features/demo/unused.ts',
  `globalThis.__loaded = 'UNUSED_PIECE'\nexport const unused = 1\n`,
)
write(
  'src/features/demo/index.ts',
  `export { used } from './used'\nexport { unused } from './unused'\n`,
)
write(
  'src/main.ts',
  `import { used } from './features/demo'\nconsole.log(used)\n`,
)

async function bundle(withPlugin: boolean): Promise<string> {
  const result = (await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: withPlugin ? [featureIndexWithoutSideEffects()] : [],
    build: {
      write: false,
      minify: false,
      rolldownOptions: { input: join(root, 'src/main.ts') },
    },
  })) as Rollup.RollupOutput | Rollup.RollupOutput[]
  const outputs = Array.isArray(result) ? result : [result]
  return outputs
    .flatMap((output) => output.output)
    .map((item) => ('code' in item ? item.code : ''))
    .join('\n')
}

describe('featureIndexWithoutSideEffects', () => {
  it('marks only src/features/<name>/index.ts, on any path separator', () => {
    const plugin = featureIndexWithoutSideEffects()
    const transform = plugin.transform as (
      code: string,
      id: string,
    ) => { moduleSideEffects: boolean } | undefined

    expect(transform('x', '/app/src/features/tasks/index.ts')).toEqual({
      code: 'x',
      moduleSideEffects: false,
    })
    expect(
      transform('x', 'C:\\app\\src\\features\\tasks\\index.ts')
        ?.moduleSideEffects,
    ).toBe(false)

    expect(transform('x', '/app/src/features/tasks/components/index.ts')).toBe(
      undefined,
    )
    expect(transform('x', '/app/src/features/tasks/useTasks.ts')).toBe(
      undefined,
    )
    expect(transform('x', '/app/src/shared/index.ts')).toBe(undefined)
    // A dependency with the same folder names is not ours to change.
    expect(transform('x', '/app/node_modules/x/src/features/a/index.ts')).toBe(
      undefined,
    )
  })

  it('keeps an unused re-export out of the bundle', async () => {
    const code = await bundle(true)
    expect(code).toContain('USED_PIECE')
    expect(code).not.toContain('UNUSED_PIECE')
  }, 30_000)

  it('is needed: without it the unused piece is bundled', async () => {
    // Guards the test above: if the bundler ever drops such modules on its
    // own, this fails and the plugin can go.
    const code = await bundle(false)
    expect(code).toContain('UNUSED_PIECE')
  }, 30_000)
})
