import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist/', '.verify-out/', 'node_modules/', 'public/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Unused names that start with _ are deliberate (ignored arguments).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Single-word names such as Card or Toast read fine in this app.
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    // Layers below the features (shared UI, shared composables, domain types, sync
    // engine, low-level libs) know nothing about a feature or a page. If a piece
    // needs a feature, it belongs inside that feature instead.
    files: [
      'src/shared/**/*.{ts,vue}',
      'src/entities/**/*.ts',
      'src/sync/**/*.ts',
      'src/lib/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/**', '**/pages/**'],
              message:
                'Shared layers must not depend on features or pages. Move this file into the feature that needs it.',
            },
          ],
        },
      ],
    },
  },
  {
    // A feature uses another feature only through its public API, the
    // features/<name>/index.ts file. Its other files are internal and may change.
    // tests/unit/architecture.test.ts also checks dynamic import() and that the
    // features never depend on each other in a circle.
    files: ['src/features/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*/**', '!../../../**'],
              message:
                "Import another feature through its public API ('../../<feature>'). If it lacks what you need, export it from that feature's index.ts.",
            },
            {
              group: ['**/pages/**'],
              message:
                'Features must not depend on the page. Pass data down as props or move the shared piece to src/shared.',
            },
          ],
        },
      ],
    },
  },
  // Formatting is Prettier's job; this turns off the rules that would fight it.
  prettier,
)
