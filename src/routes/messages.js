const express = require('express');
const router = express.Router();

const { getConversation } = require('../controllers/messagesController');

router.get('/:otherUserId', getConversation);

module.exports = router;
// src/routes/messages.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get messages between current user and another user
router.get('/:otherUserId', async (req, res) => {
  const otherUserId = parseInt(req.params.otherUserId, 10);
  if (Number.isNaN(otherUserId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }
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
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;






