# Expense Tracker — Project & Interview Guide

Use this as a walkthrough for explaining the project in an interview. It describes the implementation in this repository, including the distinction between features available in the interface and capabilities that currently exist only in the API.

## 1. The project in one sentence

Expense Tracker is a full-stack personal-finance application for recording income and expenses, reviewing balances, managing category-based monthly budgets, and exploring transaction trends, with account authentication and a responsive, themeable interface.

## 2. Interview pitch

### 30-second version

> I built a full-stack personal-finance tracker with a React 19 and Vite frontend and an Express API backed by PostgreSQL and Prisma. Users can register or sign in, manage income and expenses, filter and search transactions, set monthly category budgets, and view charts and downloadable reports. The API scopes financial records to the authenticated user, uses JWTs and bcrypt for authentication, and the project includes Playwright end-to-end coverage. I also designed the app to run locally against a hosted PostgreSQL database and deploy as a Vite frontend plus API function on Vercel.

### 90-second version

> The project addresses a common personal-finance workflow: people need a quick way to record transactions, understand their net balance, and see whether they are staying within spending limits. The interface has dashboard, transactions, budgets, and analytics views. Users can create and edit transactions, filter by type and category, search descriptions, sort by date or amount, and set monthly budgets with visual warning thresholds. Analytics includes category spending, monthly income versus expenses, balance over time, CSV export, and PNG chart downloads.
>
> Architecturally, React owns the interactive state and calls an Express 5 API. Prisma maps PostgreSQL models for users, transactions, budgets, savings goals, and recurring transactions. The API authenticates protected requests with a JWT, and query handlers use the authenticated user ID when accessing that user's records. Passwords are hashed with bcrypt; authentication endpoints are rate-limited. Vite proxies local `/api` requests to Express, while Vercel serves the static Vite build and routes API traffic to an Express function.
>
> I also kept track of what is and is not complete: savings-goal and recurring-transaction models and endpoints are implemented, but dedicated screens for them are not part of the current React navigation. If I extended the project, I would build those screens, strengthen request validation, use exact decimal money representation, and connect password reset to a real email provider.

### Resume-style project description

**Expense Tracker — Full-Stack Personal Finance App**

- Built a React 19/Vite client and Express 5 REST API for authenticated income and expense tracking.
- Modeled users, transactions, monthly budgets, savings goals, and recurring transactions with Prisma and PostgreSQL.
- Added JWT-based authentication, bcrypt password hashing, per-user data access, and rate-limited authentication routes.
- Implemented searchable/filterable transaction management, monthly budget progress indicators, Recharts analytics, and CSV/PNG exports.
- Configured local API proxying, Playwright end-to-end tests, and a Vercel deployment path for the frontend and API.

## 3. What the application does

### Available in the current UI

1. **Account access**
   - Register and sign in with email and password.
   - Restore a saved session from a browser-stored token.
   - Sign out, change a password, and use the password-reset screens.
   - The sign-in page includes a demo-login convenience button intended for a seeded/demo environment.
   - Password reset currently returns and displays a reset token in the app; it does not send an email.

2. **Dashboard**
   - Shows income, expense, and balance totals based on the user's loaded transactions.
   - Combines transaction entry, budget progress, and the transaction list in one view.

3. **Transaction management**
   - Create income or expense entries with a description, amount, category, and date.
   - Edit and delete entries; deletion requires confirmation.
   - Filter by transaction type and category, search descriptions, and sort by newest, oldest, highest amount, or lowest amount.
   - The category list is shared from `src/lib/categories.js`: food, housing, utilities, transport, entertainment, salary, and other.

4. **Monthly budgets**
   - Set one budget per category; saving again for the same category updates its amount.
   - Compare the current month's expense total in that category with its limit.
   - Show a warning at 80% and an over-budget state at 100%, with a progress bar.
   - Remove a budget.

5. **Analytics and exports**
   - Donut chart: spending by category.
   - Bar chart: monthly income versus expenses.
   - Line chart: running balance over transaction dates.
   - Export the transaction list as CSV and download individual chart cards as PNG.

6. **Navigation and presentation**
   - Dashboard, transactions, budgets, and analytics navigation.
   - Responsive sidebar that can collapse on desktop or open as a mobile drawer.
   - Sidebar search shortcut (`/`), category shortcuts, and a compact balance summary.
   - Dark and light themes. The app defaults to dark and does not follow the operating-system theme.
   - The sign-in experience has a distinct wabi-sabi-inspired visual treatment; the rest of the app uses a neutral shadcn/Tailwind design system.

### Implemented in the API/data model, but not a dedicated UI feature yet

- **Savings goals:** authenticated CRUD endpoints and a Prisma model with target/current amounts, optional category, target date, and notes. The dashboard-summary API calculates progress and remaining amounts.
- **Recurring transactions:** authenticated CRUD endpoints, active/inactive state, daily/weekly/monthly/yearly next-date logic, and endpoints to process one or all due entries into ordinary transactions.
- These are backend capabilities, not currently navigable end-user screens. Avoid presenting them in an interview as complete UI flows.
- The backend also has a dashboard-summary endpoint that calculates totals, current-month totals, biggest expense category, recent transactions, savings-goal progress, and active recurring entries. The current React `App` loads transactions and budgets directly and computes its visible summary in the frontend; it does not currently consume that summary endpoint.

## 4. Technology stack

| Area | Technologies | Role in this project |
|---|---|---|
| Frontend | React 19, React DOM, Vite 7 | Single-page application and development/build tooling |
| Styling and UI | Tailwind CSS 4, shadcn-style UI components, Base UI, `class-variance-authority`, `clsx`, `tailwind-merge` | Utility styling and reusable controls, dialogs, tables, cards, and selects |
| Charts and exports | Recharts, `html-to-image`, browser `Blob`/download APIs | Data visualization, PNG chart capture, CSV download |
| Icons, theme, notifications | Lucide React, `next-themes`, Sonner | Icons, dark/light theme switching, feedback toasts |
| Backend | Node.js, Express 5 | REST endpoints, authentication middleware, and request handling |
| Database | PostgreSQL, Prisma 7, `@prisma/adapter-pg`, `pg` | Relational persistence and typed model queries |
| Authentication | JSON Web Tokens, `jsonwebtoken`, bcrypt | Signed bearer-token sessions and salted password hashes |
| Deployment | Vercel, Vite static build, Express API function | Frontend hosting and `/api` function routing |
| Testing | Playwright Test | Browser-level end-to-end coverage |

This repository is JavaScript/JSX rather than a TypeScript application. The presence of TypeScript-related packages/configuration in the toolchain does not make the application source TypeScript.

## 5. Architecture and request flow

```text
Browser
  React UI (src/)
    ├── App owns transactions, budgets, auth state, navigation and handlers
    ├── Views: Summary, TransactionForm, TransactionList,
    │          BudgetManager, Analytics and Sidebar
    └── fetch('/api/...') with JSON and, for protected routes, bearer JWT
            │
            ├── Local development: Vite proxy → localhost:3000
            └── Deployment: Vercel API function → Express app
                                      │
                         requireAuth verifies JWT
                                      │
                        Prisma Client + PostgreSQL
```

### Frontend responsibilities

- `src/App.jsx` is the composition/root component. It owns the loaded transaction and budget collections, user/session display state, active view, shared search/category filters, sidebar collapse state, and API handlers.
- `src/TransactionForm.jsx` validates and submits new entries.
- `src/TransactionList.jsx` derives filtered/sorted rows in the browser and presents edit/delete dialogs.
- `src/BudgetManager.jsx` calculates category spending for the current month from the loaded transactions and displays progress.
- `src/Analytics.jsx` derives chart data from the transaction collection and handles exports.
- `src/Sidebar.jsx` controls navigation, search/category shortcuts, theme, logout, and account settings.
- `src/AuthPage.jsx` handles sign-in, registration, forgot-password, and reset-password screens.

Most screen-level derived data is calculated client-side from the transactions and budgets loaded into `App`; CRUD mutations call the API and then update React state.

### Backend responsibilities

- `server/index.js` configures Express JSON parsing, the auth rate limiter, public health/auth routes, protected domain routes, and error/not-found responses.
- `server/middleware/auth.js` reads the bearer token, verifies its signature with `JWT_SECRET`, and attaches the decoded user ID to the request.
- `server/routes/auth.js` owns registration, login, reset-password, and change-password flows.
- Protected database queries use `req.userId` to scope reads and check ownership before updating or deleting records.
- `api/index.js` adapts the Express app for Vercel and normalizes incoming paths to the `/api` prefix.

### Data model

| Model | Main fields and relationships |
|---|---|
| `User` | Unique email, password hash, optional reset token/expiry; owns transactions, budgets, savings goals, and recurring transactions |
| `Transaction` | Description, amount, type, category, date, created timestamp, and `userId` |
| `Budget` | Category, amount, `userId`; unique constraint on `(userId, category)` |
| `SavingsGoal` | Name, target/current amounts, optional category/date/notes, timestamps, and `userId` |
| `RecurringTransaction` | Transaction details, frequency, next date, optional day of month, active flag, last-generated timestamp, and `userId` |

The schema is in `prisma/schema.prisma`; database changes are tracked under `prisma/migrations/`.

## 6. Authentication and data access, technically

1. Registration checks required inputs and whether the email already exists.
2. Passwords are hashed with bcrypt using a work factor of 10 before storage.
3. Login looks up the user and compares the submitted password with the stored hash.
4. Successful registration/login signs a JWT with the user's ID and a seven-day expiry.
5. The frontend stores that token in `localStorage` and includes it as `Authorization: Bearer <token>` on protected requests.
6. `requireAuth` verifies the token with `JWT_SECRET`. Routes use the attached user ID when querying data.
7. Auth endpoints are rate-limited to 20 requests per 15 minutes by default; test mode raises the limit to 1,000 to support automated tests.

**Security/design nuance to discuss accurately:** browser `localStorage` is convenient but accessible to JavaScript running on the page, so an XSS issue could expose the token. A production hardening discussion could compare this design with secure, HttpOnly, SameSite cookies, while considering CSRF protections and deployment constraints. The reset token is currently returned to the client rather than delivered through a private email channel, which is suitable for a demo flow but needs an email provider and appropriate token handling for a public service.

## 7. Local setup (Windows PowerShell)

### Prerequisites

- Node.js 20.19 or newer and npm.
- A PostgreSQL database reachable from the machine. The documented setup uses Neon; a local database is also possible if `DATABASE_URL` is configured correctly.
- Git, if cloning the repository.

### First-time setup

Run commands from the repository root:

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` locally and set:

- `DATABASE_URL` to the PostgreSQL connection string. For Neon, use the pooled connection string and require SSL.
- `JWT_SECRET` to a long, unique random value. Generate one without saving it into source control:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep the real `.env` local and private. Do not commit credentials, a real connection string, or a real JWT secret. The committed `.env.example` is only a placeholder template.

Generate Prisma Client, apply development migrations, and start both processes:

```powershell
npm run db:generate
npm run db:migrate
npm run dev
```

Open `http://localhost:5173`. Vite serves the frontend and proxies `/api` calls to Express on port 3000.

### Optional sample data

```powershell
npm run seed
```

The seeder creates a demo account and sample transactions. **Use only with a disposable development database:** the current script deletes existing transactions and users before inserting its demo records. Do not run it against production or personal data.

### Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Run Vite and Express together |
| `npm run client` | Run only the Vite frontend |
| `npm run server` | Run only the Express API |
| `npm run build` | Generate Prisma Client and build the frontend into `dist/` |
| `npm run preview` | Preview the Vite production build |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Create/apply development migrations |
| `npm run db:migrate:deploy` | Apply committed migrations to a deployment database |
| `npm run db:reset` | Destructively reset a development database and reapply migrations |
| `npm run seed` | Load sample data; destructive to existing users/transactions |
| `npm test` | Run the Playwright end-to-end suite |
| `npm run test:ui` | Open Playwright's interactive test UI |

## 8. Testing

The project uses Playwright browser tests in `tests/`. Existing scenarios cover:

- Login page, session restoration, demo-login request, registration, duplicate email, invalid credentials, and logout.
- Adding income/expense transactions, summary updates, deletion, and type filtering.
- Editing transaction details and client-side validation errors.
- Creating budgets, observing progress after adding a transaction, and removing budgets.

Before running `npm test`, stop any manually running `npm run dev` processes. The Playwright config reuses existing servers when available; reusing a manually started API can mean it is not running with `NODE_ENV=test`, so the normal stricter auth rate limit may interfere with test runs. The test runner is configured to start the API and client itself.

## 9. Deployment overview (Vercel + PostgreSQL)

1. Configure the target PostgreSQL `DATABASE_URL` and `JWT_SECRET` in Vercel project environment variables. Keep them out of committed files and ensure the secret is stable across instances that need to validate the same sessions.
2. Apply migrations to the deployment database using `npm run db:migrate:deploy` with the deployment database URL.
3. Import the repository into Vercel. The build is `npm run build`, and the static output directory is `dist`.
4. Keep `api/index.js` available: it exposes the Express API through the Vercel function entry point. Production frontend/API traffic uses the same project origin; the Vite proxy is for local development.
5. Deploy and verify both the frontend and `/api/health`.

Do not run `npm run db:reset` or the sample seeder against a production database. Password reset is not production-ready as an email workflow until a delivery provider and associated flow are implemented.

## 10. Cross-questions to expect (with answer outlines)

### Product and design

**Q: What problem does the app solve?**

A: It gives an individual one place to enter income/expenses, see their net position, set category spending limits, and understand trends without needing a spreadsheet.

**Q: Walk me through a typical user journey.**

A: The user registers or signs in, adds income and expense records, filters or searches them when reviewing history, sets a category budget, then checks the summary and analytics charts. They can export a CSV for further analysis.

**Q: What would you demonstrate first?**

A: Add an income and an expense, show the summary changing, set a food budget and add a matching expense to show progress, then use a transaction filter and the monthly analytics/export view.

**Q: What is the difference between the dashboard and analytics?**

A: The dashboard combines summary and operational widgets for day-to-day use. Analytics focuses on charting transaction history and exporting data.

### Frontend and API

**Q: Why keep some filtering and chart aggregation in the frontend?**

A: The app fetches a user's transaction collection and reuses it across views, so simple filters and chart calculations are straightforward and responsive without extra requests. If data volume grows, I would move aggregation, pagination, and filtering to indexed API queries.

**Q: How does the UI stay in sync after a mutation?**

A: It sends a request to the API, checks the response, and then updates the relevant React state collection. That gives immediate feedback without re-fetching all data after every change.

**Q: How does the backend prevent a user from changing another user's transaction?**

A: The bearer JWT is verified by middleware; handlers use its user ID in the lookup and check ownership before performing an update or delete. The same per-user condition is used for list endpoints.

**Q: Why use a dashboard-summary endpoint if the UI calculates its own totals?**

A: The endpoint is a backend aggregation capability that can support a future dashboard without exposing all calculations to the client. At present, the React root loads transactions/budgets and computes the displayed summary client-side, so the endpoint is not yet the UI's data source.

**Q: Are savings goals and recurring transactions complete features?**

A: Their Prisma models and authenticated API operations exist, including goal progress calculations and recurring processing. Dedicated user-facing screens and a complete scheduling experience are not wired into the current navigation, so I would describe them as backend foundations rather than finished UI features.

### Backend, database, and security

**Q: Why Prisma and PostgreSQL?**

A: PostgreSQL provides relational persistence for users and their financial records. Prisma gives a schema-driven data model, migrations, and a consistent query API; the PostgreSQL adapter connects Prisma to `pg`.

**Q: How are passwords stored?**

A: As bcrypt hashes, not plaintext. Registration and password changes hash the new password, and login compares the supplied password against the stored hash.

**Q: How does authentication work?**

A: Login issues a signed JWT containing the user ID with a seven-day expiry. The browser sends it as a bearer token; Express middleware verifies it using the server-side `JWT_SECRET` and attaches the identity to the request.

**Q: What is one security trade-off in the current implementation?**

A: The token is stored in `localStorage`, which is convenient but exposed to JavaScript in the page. I would consider secure HttpOnly cookies and appropriate CSRF defenses for a hardened deployment. I would also replace the development-style reset-token display with email delivery and review token storage/expiry handling.

**Q: Why rate-limit authentication routes?**

A: To constrain repeated login/register/reset attempts and reduce brute-force or abuse risk. The configured production/default limit is 20 requests per 15 minutes per IP, while test mode uses a higher limit so E2E tests do not exhaust it.

**Q: Why is user ownership checked in route handlers?**

A: Knowing a record ID is not authorization. The route must ensure the requested record belongs to the identity established by the verified token before changing or deleting it.

**Q: What would you change about monetary precision?**

A: The current schema uses floating-point `Float` values and JavaScript number arithmetic. For financial correctness, I would migrate amounts to integer minor units (for example cents) or a suitable database decimal type, and define rounding/serialization rules consistently across the API and UI.

**Q: Why are some dates strings?**

A: Transaction dates are represented as `YYYY-MM-DD` strings, which makes date-only comparisons and display straightforward in the current features. A larger system should establish a consistent date-only versus timestamp policy, validate date formats, and handle time zones explicitly. Goal target dates use a database date-time field.

### Testing, deployment, and improvements

**Q: What do the E2E tests verify?**

A: They exercise real browser flows—authentication, transaction CRUD and filtering, validation, and budget behavior—rather than only testing isolated helper functions.

**Q: How does local API routing differ from production?**

A: Locally, Vite proxies `/api` to Express on port 3000. On Vercel, the Vite build is static content and `api/index.js` routes API requests to the Express application as a function.

**Q: What is the most important next step?**

A: I would prioritize robust validation and financial correctness: validate request bodies and enums server-side, move currency to exact representation, and make recurring processing atomic/idempotent. Then I would complete the savings-goal and recurring-transaction screens and connect password reset to an email provider.

**Q: How would you scale the transaction list?**

A: Introduce server-side pagination and filtering, appropriate indexes (especially on user/date and user/category access patterns), and server-side summary queries. The current client-side approach is simpler for a small personal dataset but loads the whole collection.

**Q: How would you make recurring processing reliable?**

A: Run it from a scheduler/worker rather than relying on a user to call the endpoint, use database transactions to atomically create the generated transaction and advance the schedule, and add idempotency/locking so retries or concurrent workers cannot duplicate an occurrence.

## 11. Honest limitations and sensible next steps

These are useful discussion points, not claims that the current app already solves them:

1. Add complete savings-goal and recurring-transaction UI flows.
2. Integrate the dashboard-summary API or remove it if the client-side approach remains the intended design.
3. Replace floating-point currency amounts with cents or a decimal representation and migrate existing data carefully.
4. Add schema-based server-side validation for required fields, amount ranges, transaction types, categories, and date formats.
5. Make recurring processing transactional and idempotent, then trigger it from a scheduler.
6. Send reset links/tokens through a trusted email provider instead of returning the token to the browser.
7. Revisit token storage and session revocation/refresh behavior for production security needs.
8. Add pagination and server-side aggregation if transaction volume becomes large.
9. Expand automated coverage to savings-goal and recurring API behavior, authorization boundaries, invalid request payloads, and deployment smoke tests.

## 12. Quick interview checklist

- Start with the problem and a concise product pitch; then describe the architecture.
- Demonstrate a complete user flow, not just a list of libraries.
- Explain the data path: React state → bearer-token API request → auth middleware → user-scoped Prisma query → PostgreSQL.
- Be explicit that savings goals and recurring entries are API/model capabilities, not current UI screens.
- Be ready to discuss the trade-offs of localStorage JWTs, `Float` currency fields, client-side aggregation, and password reset without email.
- Do not claim production readiness for features that still need delivery, validation, or scheduling infrastructure.

## Repository map

- `src/App.jsx` — client state, API calls, and view composition.
- `src/AuthPage.jsx` — sign-in, registration, and password-reset UI.
- `src/TransactionForm.jsx`, `src/TransactionList.jsx` — transaction entry and management.
- `src/BudgetManager.jsx`, `src/Analytics.jsx`, `src/Sidebar.jsx` — budget, insights, and navigation UI.
- `server/index.js` — API setup and domain endpoints.
- `server/routes/auth.js`, `server/middleware/auth.js` — authentication routes and bearer-token middleware.
- `prisma/schema.prisma`, `prisma/migrations/` — database models and schema history.
- `tests/` — Playwright end-to-end tests.
- `README.md` — concise project setup, scripts, API overview, and deployment notes.
