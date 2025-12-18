// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const passport = require('passport');
const logger = require('./utils/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { verifyToken, verifyTokenSocket } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messagesRoutes = require('./routes/messages');
const callsRoutes = require('./routes/calls');
const analyticsRoutes = require('./routes/analytics');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, methods: ['GET', 'POST'] } });

const prisma = new PrismaClient();

// Basic security
app.use(helmet());
app.set('trust proxy', 1);
app.use(cookieParser());
app.use(express.json({ limit: '200kb' }));

// CORS
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:4000').split(',');
app.use(cors({ origin: function (origin, callback) {
  if (!origin) return callback(null, true);
  if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
  return callback(new Error('CORS policy: origin not allowed'));
}, credentials: true }));

// Rate limiters
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10) });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10) });
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

// Passport (Google strategy file should register strategy)
app.use(passport.initialize());
try { require('./passport/googleStrategy'); } catch (e) { logger.warn('Google strategy not configured: %s', e.message); }

// Serve static
app.use(express.static(path.join(__dirname, '..', 'public')));

// Public routes
app.use('/api/auth', authRoutes);

// Protected API routes
app.use('/api/dashboard', verifyToken, dashboardRoutes);
app.use('/api/analytics', verifyToken, analyticsRoutes);
app.use('/api/messages', verifyToken, messagesRoutes);
app.use('/api/users', verifyToken, userRoutes);
app.use('/api/calls', verifyToken, callsRoutes);

// Health and misc
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Socket.io auth
io.use(async (socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: missing token'));
  try {
    const payload = await verifyTokenSocket(token, true);
    socket.user = payload;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  logger.info('Socket connected: %s', socket.user && socket.user.id);
  socket.join(`user_${socket.user.id}`);
});

const PORT = process.env.PORT || 4002;
if (!process.env.JWT_SECRET) {
  logger.error('[security] JWT_SECRET is not set. Generate one using `npm run generate-secret` and set it in .env');
}

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception: %o', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection: %o', reason);
});

server.listen(PORT, () => logger.info('Server listening on port %d', PORT));
