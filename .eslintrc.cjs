module.exports = {
  env: { browser: true, es2021: true },
  overrides: [
    {
      env: { node: true },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: { sourceType: 'script' },
    },
  ],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx'],
      },
    },
  },
  plugins: ['unused-imports', 'import'],
  rules: {
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
        groups: ['builtin', 'external', 'internal', 'parent', ['sibling', 'index']],
        alphabetize: { order: 'asc', orderImportKind: 'asc' },
        'newlines-between': 'never',
      },
    ],
    'import/newline-after-import': 'error',
  },
};
