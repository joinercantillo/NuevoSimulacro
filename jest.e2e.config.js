/**
 * Jest configuration for the end to end suite.
 *
 * The suite talks to a real PostgreSQL instance started by
 * test/global-setup.mjs with the `embedded-postgres` package, so it runs with
 * `npm run test:e2e` without Docker or any manual setup.
 *
 * Every value comes from .env: the file is loaded here and the TEST_* keys are
 * mapped to the variables ConfigModule validates when the application boots.
 * Nothing is hardcoded in this file.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const envPath = join(process.cwd(), '.env');

if (!existsSync(envPath)) {
  throw new Error(
    '.env not found. Copy .env.example to .env before running the e2e suite.',
  );
}

process.loadEnvFile(envPath);

/** Reads a mandatory key from .env and fails with a clear message. */
const required = (name) => {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing "${name}" in .env. Complete the test section of .env.example.`,
    );
  }

  return value.trim();
};

// Jest workers inherit process.env: these variables are read by ConfigModule
// when the testing application boots.
process.env.DB_HOST = required('TEST_DB_HOST');
process.env.DB_PORT = required('TEST_PG_PORT');
process.env.DB_NAME = required('TEST_DB_NAME');
process.env.DB_USER = required('TEST_DB_USER');
process.env.DB_PASSWORD = required('TEST_DB_PASSWORD');
process.env.DB_SYNCHRONIZE = required('TEST_DB_SYNCHRONIZE');
process.env.API_KEYS = required('TEST_API_KEYS');
process.env.PORT = required('PORT');

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
