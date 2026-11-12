import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Dates in the tests are local dates, so the zone is fixed: the same run gives
// the same days on a laptop in Kyiv and on the CI machine.
process.env.TZ = 'UTC'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      include: ['tests/unit/**/*.test.ts'],
    },
  }),
)
