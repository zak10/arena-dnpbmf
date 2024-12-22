// ESLint configuration for Arena MVP React Web Application
// Version requirements:
// eslint: ^8.0.0
// @typescript-eslint/parser: ^5.0.0
// @typescript-eslint/eslint-plugin: ^5.0.0
// eslint-plugin-react: ^7.32.0
// eslint-plugin-react-hooks: ^4.6.0
// eslint-config-prettier: ^8.8.0
// eslint-plugin-security: ^1.7.1
// eslint-plugin-react-perf: ^3.3.1

module.exports = {
  // Stop looking for ESLint configurations in parent folders
  root: true,

  // Environment configuration
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },

  // Extended configurations
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:security/recommended',
    'plugin:react-perf/recommended',
    'prettier', // Must be last to override other style rules
  ],

  // Parser configuration
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },

  // Plugins
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'security',
    'react-perf',
  ],

  // React version detection
  settings: {
    react: {
      version: 'detect',
    },
  },

  // Custom rule configurations
  rules: {
    // React specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in Next.js/React 17+
    'react/prop-types': 'off', // Using TypeScript instead
    
    // TypeScript specific rules
    '@typescript-eslint/explicit-module-boundary-types': ['error', {
      allowArgumentsExplicitlyTypedAsAny: false,
    }],
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    
    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // General code quality rules
    'no-console': ['warn', {
      allow: ['warn', 'error'],
    }],
    'eqeqeq': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    
    // Security rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    
    // Performance rules
    'react-perf/jsx-no-new-object-as-prop': 'error',
    'react-perf/jsx-no-new-array-as-prop': 'error',
    'react-perf/jsx-no-new-function-as-prop': 'error',
    
    // Async/Promise rules
    'require-await': 'error',
    'no-return-await': 'error',
    'no-throw-literal': 'error',
  },

  // Files to ignore
  ignorePatterns: [
    'dist',
    'build',
    'coverage',
    'node_modules',
    'vite.config.ts',
    'tailwind.config.js',
  ],

  // Test file overrides
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' in test files
        'security/detect-object-injection': 'off', // Allow object injection in tests
      },
    },
  ],
};