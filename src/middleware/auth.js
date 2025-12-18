// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    logger.warn('[security] JWT_SECRET is not set. Define a strong secret in your .env file.');
}

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const tokenFromHeader = authHeader && authHeader.split(' ')[1];
    const tokenFromCookie = req.cookies && req.cookies.token;
    const token = tokenFromHeader || tokenFromCookie;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    if (!JWT_SECRET) {
        return res.status(500).json({ error: 'Server misconfiguration: JWT secret not set' });
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function verifyTokenSocket(token, returnPayload = false) {
    return new Promise((resolve, reject) => {
        if (!JWT_SECRET) return reject(new Error('JWT secret not set'));
        jwt.verify(token, JWT_SECRET, (err, payload) => {
            if (err) return reject(err);
            if (returnPayload) return resolve(payload);
            resolve(true);
        });
    });
}

module.exports = { verifyToken, verifyTokenSocket };
