import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import globals from 'globals';

export default [
  js.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  reactHooksPlugin.configs['recommended-latest'],
  eslintPluginPrettierRecommended,

  { ignores: ['lib/*'] },
  { files: ['src/**/*.{js,jsx}'] },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        alias: {
          extensions: ['.js', '.jsx'],
          map: [['@', './src']],
        },
      },
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    plugins: {
      'unused-imports': unusedImportsPlugin,
      import: importPlugin,
    },
    rules: {
      // 'react/prop-types': 'off',
      'react/jsx-filename-extension': ['error', { extensions: ['.jsx'] }],
      'react/self-closing-comp': 'error',
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'no-use-before-define': 'error',
      'arrow-body-style': 'error',
      'unused-imports/no-unused-imports': 'error',
      'import/no-unresolved': 'error',
      'import/no-duplicates': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            ['sibling', 'index'],
          ],
          alphabetize: { order: 'asc', orderImportKind: 'asc' },
          'newlines-between': 'never',
        },
      ],
      'import/newline-after-import': 'error',
    },
  },
];
