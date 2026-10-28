/**
 * Mirrors the backend config so both halves of the repo are held to the same
 * standard, plus the rules of hooks — the one class of React bug that type
 * checking cannot catch.
 */
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    // Resolve the project relative to THIS file. Without it, an editor whose
    // workspace root is the repo (not this folder) looks for the tsconfig one
    // level up and reports a parsing error on every file.
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaVersion: 'latest',
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  root: true,
  env: { browser: true, es2022: true },
  ignorePatterns: ['.eslintrc.cjs', 'dist', 'vite.config.ts', 'tailwind.config.js', 'postcss.config.js'],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
