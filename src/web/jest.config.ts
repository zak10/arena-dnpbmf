import type { Config } from '@jest/types';

/**
 * Creates and exports the Jest configuration object with comprehensive test settings
 * for the Arena MVP React web application.
 * 
 * @version Jest 29.0.0
 * @see https://jestjs.io/docs/configuration
 */
const config: Config.InitialOptions = {
  // Use jsdom environment for React component testing
  testEnvironment: 'jsdom',

  // Base directory for test file discovery
  roots: ['<rootDir>/src'],

  // Module name mapping for path aliases and static assets
  moduleNameMapper: {
    // TypeScript path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    
    // Static asset mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
    
    // Add any additional module mappings here
  },

  // Test setup file containing environment configuration
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Test file patterns
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',

  // File extensions to consider for testing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Code coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
    '!src/types/**/*',
  ],

  // Coverage thresholds to maintain code quality
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Code transformation settings
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },

  // Paths to ignore during transformation
  transformIgnorePatterns: [
    '/node_modules/',
    '\\.pnp\\.[^\\/]+$',
  ],

  // Test execution settings
  testTimeout: 10000,
  maxConcurrency: 5,

  // CI-specific settings
  ci: {
    collectCoverage: true,
    coverageReporters: ['json', 'lcov', 'text', 'clover'],
    coverageDirectory: '<rootDir>/coverage',
  },

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output for detailed test results
  verbose: true,

  // Watch plugin configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Global settings
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],
};

export default config;