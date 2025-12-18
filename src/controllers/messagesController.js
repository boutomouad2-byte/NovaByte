const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

async function getConversation(req, res) {
  const otherUserId = parseInt(req.params.otherUserId, 10);
  if (Number.isNaN(otherUserId)) return res.status(400).json({ error: 'Invalid user id' });
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: req.user.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (err) {
    logger.error('Messages error: %o', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getConversation };
