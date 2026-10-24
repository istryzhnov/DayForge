import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
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
