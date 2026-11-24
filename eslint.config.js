// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'coverage/*'],
  },
  {
    // CLAUDE.md: src/domain is pure TypeScript. No React, React Native or Expo.
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-native', 'react-native/*', 'expo', 'expo-*', '@expo/*'],
              message: 'src/domain must stay pure TypeScript: no React, React Native or Expo imports.',
            },
          ],
        },
      ],
    },
  },
]);
