# NovaByte Backend - PostgreSQL Integration

A professional, secure Node.js + Express backend with PostgreSQL integration, JWT authentication, and full integration with landing pages.

## Features

- ✅ **PostgreSQL Database** - Auto-creates "novabyte" database if it doesn't exist
- ✅ **Prisma ORM** - Type-safe database access with automatic migrations
- ✅ **JWT Authentication** - Secure token-based authentication with bcrypt password hashing
- ✅ **Winston Logging** - Comprehensive logging for errors and info messages
- ✅ **Rate Limiting** - Protection against brute-force attacks
- ✅ **Socket.IO** - Real-time messaging and call handling
- ✅ **OAuth2 Support** - Google, GitHub, LinkedIn (optional)
- ✅ **Auto-retry Logic** - Database connection retries in background
- ✅ **Landing Pages** - Fully integrated HTML pages (home.html, login.html, Dashboard.html)

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+ installed and running
- npm or yarn

### Installation

1. **Clone and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Create a `.env` file in the `backend` directory:
   ```env
   # Server
   PORT=4000
   NODE_ENV=development

   # Database (PostgreSQL)
   # Format: postgresql://username:password@host:port/database?schema=public
   # The database name will be automatically set to "novabyte" if not specified
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"

   # JWT Secret (REQUIRED)
   # Generate one using: npm run generate-secret
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

   # CORS
   FRONTEND_ORIGIN="http://localhost:4000"

   # Rate Limiting
   RATE_LIMIT_MAX=100
   AUTH_RATE_LIMIT_MAX=10

   # Logging
   LOG_LEVEL=info

   # OAuth2 (Optional)
   GOOGLE_CLIENT_ID=""
   GOOGLE_CLIENT_SECRET=""
   GOOGLE_CALLBACK_URL="http://localhost:4000/api/auth/google/callback"
   ```

4. **Generate JWT Secret (if not set):**
   ```bash
   npm run generate-secret
   ```
   Copy the generated secret to your `.env` file.

5. **Start the server:**
   ```bash
   npm run dev
   ```

The server will:
- ✅ Automatically detect PostgreSQL on common ports (5432, 5433, 5434)
- ✅ Create "novabyte" database if it doesn't exist
- ✅ Run Prisma migrations to set up tables
- ✅ Start listening on port 4000 (or PORT from .env)
- ✅ Retry database connection in background if initial connection fails

## Database Schema

The Prisma schema includes:

- **User** - id, email, passwordHash, name, title, avatarUrl, bio, phone, location, role, createdAt, updatedAt
- **Message** - id, senderId, receiverId, content, createdAt
- **Call** - id, title, participants (array), startTime, duration, type, status
- **Notification** - id, userId, content, read, createdAt
- **Analytics** - id, systemHealth, teamProductivity, userId

## API Endpoints

### Public Routes

- `POST /api/register` - Register new user
- `POST /api/login` - Login user (returns JWT token)
- `GET /api/health` - Health check
- `GET /api/auth/google` - Google OAuth login

### Protected Routes (require JWT token)

- `GET /api/users/me` - Get current user profile
- `GET /api/messages/:otherUserId` - Get messages with another user
- `GET /api/calls` - Get recent calls
- `GET /api/analytics` - Get analytics data
- `GET /api/dashboard` - Get dashboard data

### Landing Pages

- `GET /` - Serves home.html
- `GET /login` - Serves login.html
- `GET /dashboard` - Serves Dashboard.html (protected, redirects to /login if not authenticated)

## Authentication

### JWT Token Usage

After login, the backend returns a JWT token. Include it in requests:

```javascript
// In Authorization header
fetch('/api/users/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

// Or as cookie (if using cookie-based auth)
```

### Password Hashing

All passwords are hashed using bcrypt with 12 salt rounds.

## Logging

Logs are written to:
- Console (colored output)
- `logs/error.log` (errors only)
- `logs/combined.log` (all logs)

Log levels: `error`, `warn`, `info`, `debug`

## Database Connection

The server includes intelligent database connection handling:

1. **Auto-detection** - Detects PostgreSQL on common ports
2. **Auto-creation** - Creates "novabyte" database if missing
3. **Retry logic** - Retries connection up to 5 times with 2s delays
4. **Background retry** - Continues retrying every 10s if initial connection fails
5. **Server continues** - Server starts even if database is unreachable

## Development

### Run Prisma Studio (Database GUI)
```bash
npm run prisma studio
```

### Run Migrations Manually
```bash
npm run migrate
```

### Generate Prisma Client
```bash
npx prisma generate
```

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use a strong `JWT_SECRET` (at least 32 random characters)
3. Configure proper `FRONTEND_ORIGIN` for CORS
4. Use a managed PostgreSQL database (AWS RDS, Heroku Postgres, etc.)
5. Set up proper logging aggregation
6. Configure HTTPS/TLS
7. Set up process manager (PM2, systemd, etc.)

## Troubleshooting

### Database Connection Issues

- Check PostgreSQL is running: `pg_isready` or `psql -U postgres`
- Verify DATABASE_URL format in `.env`
- Check firewall/network settings
- Review logs in `logs/error.log`

### JWT Errors

- Ensure `JWT_SECRET` is set in `.env`
- Generate a new secret: `npm run generate-secret`
- Check token expiration (default: 7 days)

### Prisma Errors

- Run `npx prisma generate` to regenerate client
- Run `npx prisma migrate deploy` to apply migrations
- Check Prisma schema matches database structure

## License

MIT
