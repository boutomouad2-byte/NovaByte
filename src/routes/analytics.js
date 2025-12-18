const express = require('express');
const router = express.Router();

const { getAnalytics } = require('../controllers/analyticsController');

router.get('/', getAnalytics);

module.exports = router;
// src/routes/analytics.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get latest analytics row (optionally per‑user later)
router.get('/', async (req, res) => {
  try {
    const latest = await prisma.analytics.findFirst({
      orderBy: { id: 'desc' },
    });
    res.json(latest || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;






