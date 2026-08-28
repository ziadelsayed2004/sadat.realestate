import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const nodeGlobals = {
  Buffer: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  performance: 'readonly',
  process: 'readonly',
  setTimeout: 'readonly',
  structuredClone: 'readonly'
};

const browserCaptureGlobals = {
  document: 'readonly',
  window: 'readonly',
  Image: 'readonly',
  HTMLImageElement: 'readonly',
  HTMLElement: 'readonly',
  Text: 'readonly',
  innerWidth: 'readonly',
  innerHeight: 'readonly',
  getComputedStyle: 'readonly',
  requestAnimationFrame: 'readonly'
};

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', 'agent_pack/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: nodeGlobals,
      sourceType: 'module'
    },
    rules: {
      'no-control-regex': 'off',
      'no-useless-escape': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrors: 'none'
      }]
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-undef': 'off'
    }
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        ...nodeGlobals,
        ...browserCaptureGlobals
      }
    }
  }
);
