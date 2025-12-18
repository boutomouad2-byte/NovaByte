// src/routes/init.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('[security] init route requires JWT_SECRET to be set in environment');
}
const GUEST_DOMAIN = 'guest.novabyte.local';

// Helper to generate a random password (never stored plain‑text)
function generateRandomPassword(length = 12) {
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    let pwd = '';
    for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
}

/**
 * Internal function that builds the same payload as the dashboard overview route.
 * It expects a userId that is already authenticated.
 */
async function buildDashboardPayload(userId) {
    // 1️⃣ Profile
    const profile = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            title: true,
            avatarUrl: true,
            bio: true,
            phone: true,
            location: true,
            role: true,
        },
    });

    // 2️⃣ Team (all active users except self)
    const team = await prisma.user.findMany({
        where: { id: { not: userId }, isActive: true, deletedAt: null },
        select: { id: true, name: true, title: true, avatarUrl: true, role: true },
        orderBy: { name: 'asc' },
    });

    // 3️⃣ Recent conversations derived from messages table
    // Fetch recent messages involving the user and reduce to one conversation per other participant
    const recentMessages = await prisma.message.findMany({
        where: {
            OR: [{ senderId: userId }, { receiverId: userId }],
        },
        include: {
            sender: { select: { id: true, name: true, avatarUrl: true } },
            receiver: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });

    const convMap = new Map();
    for (const msg of recentMessages) {
        const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
        if (!convMap.has(otherUserId)) {
            const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
            convMap.set(otherUserId, {
                id: `${otherUserId}`,
                participants: [otherUserId],
                lastMessage: msg.content,
                timestamp: msg.createdAt,
                unread: 0, // Message model does not include read flags; default to 0
                messages: [{ id: msg.id, sender: msg.senderId, text: msg.content, time: msg.createdAt }],
            });
        }
    }
    const conversations = Array.from(convMap.values()).slice(0, 10);

    // 4️⃣ Upcoming/Ongoing calls (status = ONGOING)
    const upcomingCalls = await prisma.call.findMany({
        where: { participants: { has: userId }, status: 'ONGOING' },
        orderBy: { startTime: 'desc' },
        take: 5,
    });

    // 5️⃣ Latest analytics row
    const analytics = await prisma.analytics.findFirst({ orderBy: { id: 'desc' } });

    return { profile, team, conversations, upcomingCalls, analytics };
}

/**
 * GET /api/init
 * If a valid JWT is supplied, return the normal dashboard payload.
 * If no JWT (or it is invalid), automatically create a guest user,
 * issue a JWT, and return the same payload together with the token.
 */
router.get('/', async (req, res) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    // Helper to send payload + token
    const sendPayload = async (userId, jwtToken) => {
        const payload = await buildDashboardPayload(userId);
        res.json({ token: jwtToken, ...payload });
    };

    // ----------------------------------------------------------------
    // 1️⃣ If token exists, verify it first
    // ----------------------------------------------------------------
    if (token) {
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            // token valid – just return dashboard data
            return await sendPayload(payload.id, token);
        } catch (e) {
            // fall through to guest creation
        }
    }

    // ----------------------------------------------------------------
    // 2️⃣ No valid token → create a guest account
    // ----------------------------------------------------------------
    if (!JWT_SECRET) return res.status(500).json({ error: 'Server misconfiguration: JWT secret not set' });

    try {
        const guestId = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const email = `${guestId}@${GUEST_DOMAIN}`;
        const password = generateRandomPassword();
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name: 'Guest User',
                title: 'Visitor',
                avatarUrl: null,
                bio: '',
                phone: '',
                location: '',
            },
        });
        const newToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        // Set secure HttpOnly cookie for guest session and return payload (do NOT expose password)
        const payload = await buildDashboardPayload(user.id);
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json(payload);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to initialise dashboard' });
    }
});

module.exports = router;
