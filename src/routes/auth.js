const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

if (!JWT_SECRET) {
    console.warn('[security] JWT_SECRET is not set. Define a strong secret in your .env file.');
}

function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
    return typeof password === 'string' && password.length >= 8;
}

// Register a new user
router.post('/register', async (req, res) => {
    const { email, password, name, title, avatarUrl, bio, phone, location } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password and name are required' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!isStrongPassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(409).json({ error: 'User already exists' });
        const passwordHash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { email, passwordHash, name, title, avatarUrl, bio, phone, location },
        });
        if (!JWT_SECRET) {
            return res.status(500).json({ error: 'Server misconfiguration: JWT secret not set' });
        }
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        // Set secure, HttpOnly cookie instead of relying on client-side storage
        res.cookie('token', token, cookieOptions);
        res.json({ user: { id: user.id, email: user.email, name: user.name, title: user.title, avatarUrl: user.avatarUrl } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login existing user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
        if (!JWT_SECRET) {
            return res.status(500).json({ error: 'Server misconfiguration: JWT secret not set' });
        }
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        // Set secure, HttpOnly cookie instead of relying on client-side storage
        res.cookie('token', token, cookieOptions);
        res.json({ user: { id: user.id, email: user.email, name: user.name, title: user.title, avatarUrl: user.avatarUrl } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout – clear the auth cookie
router.post('/logout', (req, res) => {
    res.clearCookie('token', cookieOptions);
    res.json({ ok: true });
});

module.exports = router;
