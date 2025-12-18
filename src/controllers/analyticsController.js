const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

async function getAnalytics(req, res) {
  try {
    const latest = await prisma.analytics.findFirst({ orderBy: { id: 'desc' } });
    res.json(latest || {});
  } catch (err) {
    logger.error('Analytics error: %o', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAnalytics };
