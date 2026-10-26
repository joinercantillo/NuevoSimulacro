/** Jest global teardown: stops the embedded PostgreSQL cluster. */
export default async function globalTeardown() {
  const postgres = globalThis.__ARENOSA_TEST_POSTGRES__;

  if (postgres) {
    await postgres.stop();
    console.log('[e2e] PostgreSQL stopped');
    return;
  }

  // embedded-postgres registers an exit handler, so the cluster is already shut
  // down when this instance did not travel with the Jest process.
  console.warn('[e2e] PostgreSQL instance not available in this process');
}
