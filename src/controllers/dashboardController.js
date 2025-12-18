const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

async function getDashboard(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, title: true, avatarUrl: true }
    });

    const team = await prisma.user.findMany({ where: { id: { not: userId }, isActive: true }, select: { id: true, name: true, title: true, avatarUrl: true }, take: 20 });

    const recentMessages = await prisma.message.findMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] }, orderBy: { createdAt: 'desc' }, take: 50 });

    const calls = await prisma.call.findMany({ where: { participants: { has: userId } }, orderBy: { startTime: 'desc' }, take: 20 });

    const analytics = await prisma.analytics.findFirst({ orderBy: { id: 'desc' } });

    res.json({ profile, team, recentMessages, calls, analytics });
  } catch (err) {
    logger.error('Dashboard error: %o', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
}

module.exports = { getDashboard };
