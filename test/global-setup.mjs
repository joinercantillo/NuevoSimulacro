/**
 * Jest global setup: starts a disposable PostgreSQL cluster with
 * `embedded-postgres` and creates the database used by the e2e suite.
 *
 * The instance is kept in globalThis so global-teardown.mjs can stop it from
 * the same Jest process.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const port = Number(process.env.TEST_PG_PORT ?? 55440);
const databaseDir = join(tmpdir(), 'arenosa-e2e-postgres');

export default async function globalSetup() {
  // A leftover cluster from an interrupted run would break initdb and the port.
  rmSync(databaseDir, { recursive: true, force: true });
  mkdirSync(databaseDir, { recursive: true });

  const postgres = new EmbeddedPostgres({
    databaseDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: false,
    onLog: () => {},
    onError: (message) => console.error(message),
  });

  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase('reservations_test');

  globalThis.__ARENOSA_TEST_POSTGRES__ = postgres;
  console.log(`[e2e] PostgreSQL 18.4 listening on 127.0.0.1:${port} (database: reservations_test)`);
}
