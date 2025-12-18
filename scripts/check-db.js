#!/usr/bin/env node
require('dotenv').config();
const { Client } = require('pg');
const path = require('path');
const logger = require('../src/utils/logger');
const { ensureDatabaseExists, buildDatabaseUrlFromEnv } = require('../src/utils/dbInit');

/**
 * Simple DB checker script used during setup/CI to validate DB credentials,
 * create the target DB if missing, and report clear errors.
 */
async function main() {
  const maxAttempts = 5;
  const delayMs = 2000;

  // Build connection string from env values when possible
  const envUrl = process.env.DATABASE_URL || buildDatabaseUrlFromEnv();
  if (!envUrl) {
    console.error('No database connection information found. Set DATABASE_URL or DB_USER/DB_PASSWORD/DB_HOST/DB_PORT/DB_NAME in .env');
    process.exit(2);
  }

  // Ensure DB exists (may require privileges)
  const ensured = await ensureDatabaseExists(envUrl);
  if (!ensured) {
    logger.warn('Could not ensure database exists. Proceeding to connection attempts which may still succeed if DB already exists.');
  }

  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const client = new Client({ connectionString: envUrl });
      await client.connect();
      await client.end();
      console.log(`Database reachable (attempt ${attempt}/${maxAttempts}). Connection successful.`);
      process.exit(0);
    } catch (err) {
      if (err && err.code === '28P01') {
        console.error(`Authentication failed (attempt ${attempt}/${maxAttempts}). Please check DB_USER/DB_PASSWORD in .env`);
      } else if (err && (err.code === 'ECONNREFUSED' || /connect ECONNREFUSED/i.test(err.message))) {
        console.error(`Connection refused (attempt ${attempt}/${maxAttempts}). Is Postgres running at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}?`);
      } else {
        console.error(`Database connection error (attempt ${attempt}/${maxAttempts}):`, err.message || err);
      }

      if (attempt >= maxAttempts) {
        console.error('Exceeded maximum connection attempts. Please fix credentials or start Postgres and try again.');
        process.exit(3);
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

main().catch((err) => {
  console.error('Unexpected error while checking DB:', err && err.stack ? err.stack : err);
  process.exit(4);
});
