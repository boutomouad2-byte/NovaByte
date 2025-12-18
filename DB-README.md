# Local PostgreSQL for NovaByte (Docker)

This file explains how to run a local PostgreSQL instance compatible with the backend and landing pages.

Quick steps

1. From `backend/` start Postgres and pgAdmin:

```bash
docker compose up -d
```

2. Confirm Postgres is healthy (pg_isready) or view logs:

```bash
docker compose logs -f db
```

3. The repository `.env` already points to the local DB:

  - `DATABASE_URL=postgresql://postgres:novabyte_pass_2025@localhost:5432/novabyte?schema=public`

4. From the `backend/` folder run (first-time setup):

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

Optional: validate DB credentials and auto-create DB (recommended before migrate):

```bash
npm run check-db
```

This will try to connect using `DATABASE_URL` or `DB_*` env vars, create the database if missing, and retry connection up to 5 times with clear logs.

Notes

- pgAdmin is available at http://localhost:8080 using the credentials in `docker-compose.yml`.
- The backend connects to the DB using the `DATABASE_URL` value in `.env`. If you change the DB password, update `.env` accordingly.
- For CI/prod use `prisma migrate deploy` and a secure managed Postgres instance; do not commit production credentials.
