const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { rules: { 'no-eval': 'error', 'no-implied-eval': 'error', eqeqeq: ['error', 'always', { null: 'ignore' }] } },
  { ignores: ['dist/**', 'coverage/**'] },
]);
