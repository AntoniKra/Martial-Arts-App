import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'spikes/firestore-offline/dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/refs': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // ADR 0006: validation uses the tree-shakeable zod/mini build and no form library.
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'zod', message: 'Import from zod/mini (docs/adr/0006-validation-with-zod-mini.md).' },
          { name: 'react-hook-form', message: 'Use controlled inputs and a tested validation function (ADR 0006).' },
        ],
        patterns: [{ group: ['zod/v4', 'zod/v4/*', 'zod/v3', 'zod/v3/*'], message: 'Import from zod/mini (ADR 0006).' }],
      }],
    },
  },
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      // ADR 0006: document schemas live in src/infrastructure; the domain stays library-free.
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['zod', 'zod/*'], message: 'Keep schemas in src/infrastructure (ADR 0006).' }],
      }],
    },
  },
)
