import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'

/** A feature's public API file: src/features/<name>/index.ts. */
const FEATURE_INDEX = /[\\/]src[\\/]features[\\/][^\\/]+[\\/]index\.ts$/

/**
 * Feature index files only re-export. Telling the bundler they have no side
 * effects lets it keep just the exports a caller uses, so importing one piece
 * of a feature does not pull the rest (for example a dialog that is otherwise
 * lazy-loaded) into the first chunk.
 */
export function featureIndexWithoutSideEffects(): Plugin {
  return {
    name: 'dayforge:feature-index-without-side-effects',
    transform(code, id) {
      if (FEATURE_INDEX.test(id) && !id.includes('node_modules')) {
        return { code, moduleSideEffects: false }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), featureIndexWithoutSideEffects()],
  build: {
    rolldownOptions: {
      output: {
        // Vendor code goes into stable, separately cacheable chunks. Supabase
        // stays eagerly loaded (sync needs it early) but no longer lives in
        // the app chunk, so app releases do not invalidate it.
        codeSplitting: {
          groups: [
            {
              name: 'supabase',
              test: /node_modules[\\/]@supabase[\\/]/,
              priority: 20,
            },
            {
              name: 'vue',
              test: /node_modules[\\/](vue|@vue)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
