/**
 * Jest configuration for the end to end suite.
 *
 * The suite talks to a real PostgreSQL instance started by scripts in
 * test/global-setup.mjs with the `embedded-postgres` package, so it runs with
 * `npm run test:e2e` without Docker or any manual setup.
 */

const port = Number(process.env.TEST_PG_PORT ?? 55440);

// Jest workers inherit process.env: these variables are read by ConfigModule
// when the testing application boots.
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = String(port);
process.env.DB_NAME = 'reservations_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_SYNCHRONIZE = 'true';
process.env.API_KEYS = 'test-key-via40, test-key-malecon';
process.env.PORT = '3000';

/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.json' }],
  },
  setupFiles: ['<rootDir>/test/setup-jest.ts'],
  globalSetup: '<rootDir>/test/global-setup.mjs',
  globalTeardown: '<rootDir>/test/global-teardown.mjs',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  // One worker: the suite shares a single database and the state machine tests
  // are easier to follow when they run in order.
  maxWorkers: 1,
  testTimeout: 60000,
};
