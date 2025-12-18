const { PrismaClient } = require('@prisma/client');
const { buildDatabaseUrlFromEnv } = require('./dbInit');

// Singleton PrismaClient instance - created exactly once
let prismaInstance = null;

function buildDatasourceUrl() {
  // Prefer explicit DATABASE_URL; otherwise use per-value DB_* env vars
  const explicit = process.env.DATABASE_URL;
  if (explicit) return explicit;
  const fromParts = buildDatabaseUrlFromEnv();
  return fromParts || undefined;
}

function getPrisma() {
  if (!prismaInstance) {
    const url = buildDatasourceUrl();
    const options = {
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    };
    if (url) {
      options.datasources = { db: { url } };
    }
    prismaInstance = new PrismaClient(options);
  }
  return prismaInstance;
}

module.exports = { getPrisma };
module.exports.prisma = null;
