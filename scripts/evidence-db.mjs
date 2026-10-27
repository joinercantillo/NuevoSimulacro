#!/usr/bin/env node
/**
 * Disposable PostgreSQL used by scripts/evidence.ps1.
 *
 * Boots an embedded cluster with the TEST_* settings of .env, writes a ready
 * marker and stays alive until a stop marker appears, so the PowerShell script
 * can call the API and shut everything down cleanly afterwards.
 *
 *   node scripts/evidence-db.mjs
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(projectRoot, '.env');

if (!existsSync(envPath)) {
  throw new Error('.env not found. Copy .env.example to .env before generating the evidence.');
}

process.loadEnvFile(envPath);

const required = (name) => {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing "${name}" in .env`);
  }
  return value.trim();
};

const readyFile = join(tmpdir(), 'arenosa-evidence-db.ready');
const stopFile = join(tmpdir(), 'arenosa-evidence-db.stop');
const databaseDir = join(tmpdir(), 'arenosa-evidence-postgres');

const port = Number(required('TEST_PG_PORT'));
const host = required('TEST_DB_HOST');
const database = required('TEST_DB_NAME');
const user = required('TEST_DB_USER');
const password = required('TEST_DB_PASSWORD');

const stop = async (postgres) => {
  try {
    await postgres.stop();
    console.log('[evidence] PostgreSQL stopped');
  } catch (error) {
    console.error(`[evidence] could not stop PostgreSQL: ${error.message}`);
  }
};

const bootstrap = async () => {
  rmSync(readyFile, { force: true });
  rmSync(stopFile, { force: true });

  // A fresh cluster on every run: the seed and the ids of the evidence are
  // therefore reproducible.
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

  writeFileSync(readyFile, `${new Date().toISOString()}\n`);
  console.log(`[evidence] PostgreSQL listening on ${host}:${port} (database: ${database})`);

  // The PowerShell script creates the stop marker instead of killing this
  // process, so the cluster is closed gracefully.
  const timer = setInterval(() => {
    if (existsSync(stopFile)) {
      clearInterval(timer);
      void stop(postgres).finally(() => process.exit(0));
    }
  }, 500);

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      clearInterval(timer);
      void stop(postgres).finally(() => process.exit(0));
    });
  }
};

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
