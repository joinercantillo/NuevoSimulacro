/**
 * Jest global setup: starts a disposable PostgreSQL cluster with
 * `embedded-postgres` and creates the database used by the e2e suite.
 *
 * The connection settings are read from the TEST_* variables defined in .env
 * (no port, user, password or database name is hardcoded here).
 *
 * The instance is kept in globalThis so global-teardown.mjs can stop it from
 * the same Jest process.
 */
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const envPath = join(process.cwd(), '.env');

if (!existsSync(envPath)) {
  throw new Error(
    '.env not found. Copy .env.example to .env before running the e2e suite.',
  );
}

process.loadEnvFile(envPath);

const required = (name) => {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing "${name}" in .env. Complete the test section of .env.example.`,
    );
  }

  return value.trim();
};

const port = Number(required('TEST_PG_PORT'));
const user = required('TEST_DB_USER');
const password = required('TEST_DB_PASSWORD');
const database = required('TEST_DB_NAME');
const host = required('TEST_DB_HOST');
const databaseDir = join(tmpdir(), 'arenosa-e2e-postgres');

export default async function globalSetup() {
  // A leftover cluster from an interrupted run would break initdb and the port.
  rmSync(databaseDir, { recursive: true, force: true });
  mkdirSync(databaseDir, { recursive: true });

  const postgres = new EmbeddedPostgres({
    databaseDir,
    user,
    password,
    port,
    persistent: false,
    onLog: () => {},
    onError: (message) => console.error(message),
  });

  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase(database);

  globalThis.__ARENOSA_TEST_POSTGRES__ = postgres;
  console.log(`[e2e] PostgreSQL listening on ${host}:${port} (database: ${database})`);
}
