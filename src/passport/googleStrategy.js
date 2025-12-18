const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK = process.env.GOOGLE_CALLBACK_URL;

if (!CLIENT_ID || !CLIENT_SECRET) {
  logger.warn('Google OAuth not configured (missing CLIENT_ID or CLIENT_SECRET)');
} else {
  passport.use(new GoogleStrategy({ clientID: CLIENT_ID, clientSecret: CLIENT_SECRET, callbackURL: CALLBACK },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;
        if (!email) return done(new Error('No email from Google'));
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({ data: { email, name: profile.displayName || email, avatarUrl: profile.photos && profile.photos[0] && profile.photos[0].value || null } });
        }
        return done(null, { id: user.id, email: user.email });
      } catch (err) {
        logger.error('Google OAuth error: %o', err);
        return done(err);
      }
    }
  ));
}
