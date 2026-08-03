import eslint from '@eslint/js';

export default [
  {
    ignores: ['dist/**', 'node_modules/**']
  },
  eslint.configs.recommended,
  {
    files: ['ui/**/*.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        localStorage: 'readonly'
      }
    }
  }
];
