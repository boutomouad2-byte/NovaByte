const { Client } = require('pg');
const logger = require('./logger');

/**
 * Build a DATABASE_URL from individual DB_* env vars if present
 */
function buildDatabaseUrlFromEnv() {
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const name = process.env.DB_NAME || 'novabyte';
  if (user && password) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
  }
  return null;
}

/**
 * Ensure the specified database exists. Accepts either a full connection string or uses DB_* env vars.
 * Returns true if the DB exists or was created successfully.
 */
async function ensureDatabaseExists(connectionString) {
  try {
    let conn = connectionString || process.env.DATABASE_URL || buildDatabaseUrlFromEnv();
    if (!conn) {
      logger.warn('No connection information available to ensure database exists');
      return false;
    }

    // Normalize to use postgres:// for URL parsing
    const parsed = new URL(conn.replace(/^postgresql:\/\//i, 'postgres://'));
    const dbName = (parsed.pathname || '').replace(/^\//, '').split('?')[0] || process.env.DB_NAME || 'novabyte';

    // If already pointing at desired database, still ensure it exists by connecting to the server's default 'postgres' DB
    const adminDb = 'postgres';
    // Build admin connection string (same creds, but db=postgres)
    parsed.pathname = `/${adminDb}`;
    const adminConn = parsed.toString().replace(/^postgres:\/\//i, 'postgresql://');

    const adminClient = new Client({ connectionString: adminConn });
    await adminClient.connect();
    logger.info('Connected to PostgreSQL server as admin to verify database existence');

    const result = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (result.rows.length === 0) {
      // Create database
      // NOTE: creating DB requires appropriate privileges
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      logger.info('Created database "%s"', dbName);
    } else {
      logger.info('Database "%s" already exists', dbName);
    }

    await adminClient.end();
    return true;
  } catch (err) {
    logger.error('Failed to ensure database exists: %o', err);
    return false;
  }
}

/**
 * Update an arbitrary connection string to use the given DB name.
 */
function updateDatabaseUrl(originalUrl, dbName = process.env.DB_NAME || 'novabyte') {
  try {
    const u = new URL(originalUrl.replace(/^postgresql:\/\//i, 'postgres://'));
    u.pathname = `/${dbName}`;
    return u.toString().replace(/^postgres:\/\//i, 'postgresql://');
  } catch (err) {
    logger.error('Failed to parse DATABASE_URL: %o', err);
    return originalUrl;
  }
}

module.exports = { ensureDatabaseExists, updateDatabaseUrl, buildDatabaseUrlFromEnv };

