# Expense Tracker

A full-stack personal finance tracker for managing income, expenses, budgets, and account settings. The frontend is a React/Vite app; the Express API uses Prisma with PostgreSQL. It can run locally against a Neon database and deploy to Vercel without Docker.

**Live demo:** [https://expense-tracker-tawny-iota-36.vercel.app](https://expense-tracker-tawny-iota-36.vercel.app/)

## Features

- Register, sign in, and stay signed in across browser visits
- Add, edit, filter, search, sort, and delete transactions
- Income, expense, balance, and monthly budget summaries
- Analytics charts with CSV and PNG exports
- Savings-goal and recurring-transaction API endpoints
- Password change and password reset flows
- Dark/light theme and responsive navigation

## Tech stack

- React 19, Vite 7, Tailwind CSS 4
- Express 5 API on Node.js
- PostgreSQL with Prisma 7 and `@prisma/adapter-pg`
- JWT authentication and bcrypt password hashing
- Playwright end-to-end tests

## Local development

Requirements: Node.js 20.19+ and npm.

1. Install packages:

   ```sh
   npm install
   ```

2. Create a local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

   Set `DATABASE_URL` to your Neon PostgreSQL connection string and replace
   `JWT_SECRET` with a long, unique random value. The `.env` file is ignored by
   Git; do not commit it.

3. Generate Prisma Client and apply the development migrations:

   ```sh
   npm run db:generate
   npm run db:migrate
   ```

4. Start the frontend and API:

   ```sh
   npm run dev
   ```

   Open `http://localhost:5173`. Vite proxies `/api` requests to the Express API
   on port 3000.

No local database container or Docker setup is required. The app connects to
the database specified by `DATABASE_URL`.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. For Neon, use the pooled connection string and require SSL. |
| `JWT_SECRET` | Yes | Long, random secret used to sign authentication tokens. Keep it private and stable across deployments. |

Generate a secret locally with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`.env.example` contains placeholders only. Never put real credentials in source
code or a committed environment file.

## Deploy to Vercel

The Vite frontend is built as static assets, and `api/[...path].js` exposes the
Express API as a Vercel Function. API routes remain under `/api`.

1. Apply the Prisma migrations to the Neon database before the first deployment:

   ```sh
   npm run db:migrate:deploy
   ```

   Run this with `DATABASE_URL` set to the target Neon database. Repeat it when
   deploying new migrations. Do not use `db:reset` or the sample seeder on a
   production database.

2. Import this repository into Vercel. Vercel detects the Vite project, runs
   `npm run build` (which generates Prisma Client and builds the frontend), and
   serves Vite's `dist` output. The `api/[...path].js` file is still required to
   expose the Express API as a Vercel Function.

3. In the Vercel project's **Settings → Environment Variables**, set
   `DATABASE_URL` to the Neon pooled connection string and `JWT_SECRET` to a
   strong random value. Add them for every environment (Production, Preview,
   and Development) where the app should work. Keep the same JWT secret across
   instances and deployments so existing sessions remain valid.

4. Deploy. Vercel serves the frontend and `/api/*` from the same project origin;
   no Vite development proxy is used in production.

Password reset currently displays the reset token in the app instead of sending
email. Set up an email delivery provider before using this flow for a public
production service.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite and Express for local development |
| `npm run build` | Generate Prisma Client and build the frontend for production |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Create/apply development migrations |
| `npm run db:migrate:deploy` | Apply committed migrations to a deployment database |
| `npm run db:reset` | Reset a development database (destructive) |
| `npm run seed` | Load sample data into a disposable development database |
| `npm test` | Run Playwright end-to-end tests |
| `npm run test:ui` | Open the Playwright test UI |

The sample seeder creates `demo@example.com` with password `password123`. It
deletes existing users and transactions, so use it only with a disposable
development database.

## API overview

All endpoints are served from `/api`. Endpoints marked authenticated require a
Bearer token.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | API health check |
| `POST` | `/api/auth/register` | No | Create an account |
| `POST` | `/api/auth/login` | No | Sign in |
| `POST` | `/api/auth/forgot-password` | No | Generate a reset token |
| `POST` | `/api/auth/reset-password` | No | Reset a password |
| `POST` | `/api/auth/change-password` | Yes | Change a password |
| `GET` | `/api/dashboard/summary` | Yes | Dashboard totals and insights |
| `GET`, `POST`, `PATCH`, `DELETE` | `/api/transactions` | Yes | Manage transactions (`PATCH`/`DELETE` use `/:id`) |
| `GET`, `POST`, `DELETE` | `/api/budgets` | Yes | Manage budgets (`DELETE` uses `/:id`) |
| `GET`, `POST`, `PATCH`, `DELETE` | `/api/savings-goals` | Yes | Manage savings goals (`PATCH`/`DELETE` use `/:id`) |
| `GET`, `POST`, `PATCH`, `DELETE` | `/api/recurring-transactions` | Yes | Manage recurring transactions |
| `POST` | `/api/recurring-transactions/:id/process` | Yes | Process one recurring transaction |
| `POST` | `/api/recurring-transactions/process-due` | Yes | Process due recurring transactions |

## Tests

Playwright starts the app servers itself. Stop `npm run dev` before running
`npm test` so the test server starts with `NODE_ENV=test` and uses its test
authentication rate limit.

## Project layout

```text
api/[...path].js       Vercel Express function entry point
server/                Express API, authentication middleware and routes
prisma/                Prisma schema, migrations and development seeder
src/                   React application and UI components
tests/                 Playwright end-to-end tests
docs/screenshots/      README screenshots
.env.example           Local environment variable template
```
