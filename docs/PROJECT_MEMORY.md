# Project Memory: Passwordless Authentication System (College IDP)

## 1. Project Overview & Context

- **Project Name:** Passwordless Authentication System (Email & Magic Link)
- **Context:** College IDP (Independent Degree Project) / Academic Defense & Security Review
- **Repository Location:** `/home/tushardevx01/Documents/Idp`
- **Remote Repository:** `https://github.com/Tushardevx01/Idp` (Private)
- **Branch:** `main` (clean working tree)
- **Core Concept:** Eliminates static passwords (and associated vulnerabilities like credential stuffing, dictionary attacks, and password fatigue) by replacing them with cryptographically generated, high-entropy, short-lived (10-minute TTL), single-use magic links delivered via verified Email (SMTP). Once verified, authenticated sessions are managed via PostgreSQL-backed hashed session tokens delivered in HTTP-only cookies.

---

## 2. Technology Stack & Key Dependencies

- **Framework:** Next.js 15.5.26 (App Router, Server Components, Route Handlers, Edge Middleware)
- **Runtime:** Node.js 22 LTS (CSPRNG, `crypto`, `node:test`)
- **Language:** TypeScript 5.7.3 (`tsc --noEmit` clean)
- **UI Library:** React 19.0.0 & React DOM 19.0.0
- **Styling:** Tailwind CSS 3.4.17 with `postcss` 8.5.28 (overridden for vulnerability fix), `clsx`, and `tailwind-merge`
- **Icons:** `lucide-react` (v1.16.0)
- **Database:** Supabase PostgreSQL (Strictly as a pure relational PostgreSQL host; **NO** `@supabase/supabase-js`, **NO** GoTrue, **NO** Supabase Auth, **NO** Supabase Storage, **NO** Supabase Edge Functions)
- **Database Driver:** `postgres` (postgres.js v3.4.9) with connection pooling (PgBouncer port `6543`), SSL enforcement, and parameterization
- **Validation Engine:** Zod (v4.6.5 / `zod`) for RFC 5322 email normalization
- **Email Delivery Provider:** Nodemailer (v10.0.10) over standard SMTP (HTML + plain-text fallback)
- **Test Runner:** Node.js Native Test Runner (`node:test`, `node:assert`, executed via `tsx --env-file=.env --test tests/**/*.test.ts`)

---

## 3. System Architecture & File Structure

```text
/home/tushardevx01/Documents/Idp/
├── .eslintrc.json                          # Next.js ESLint configuration
├── .gitignore                              # Git exclusion rules (.env, .next, node_modules)
├── API.md                                  # HTTP endpoints and JSON payload specifications
├── ARCHITECTURE.md                         # Architectural diagram, threat boundaries, and flow
├── DATABASE.md                             # Database schema, ER diagram, indexes, and queries
├── README.md                               # Developer documentation, setup guide, and demo instructions
├── SECURITY.md                             # Security threat matrix, 20 inspection domains, and defenses
├── memory.md                               # Persistent project state, implementation decisions, and test logs
├── next.config.mjs                         # Next.js configuration with hardened HTTP security headers
├── package.json                            # Package dependencies, overrides, and npm scripts
├── postcss.config.mjs                      # PostCSS pipeline configuration
├── tailwind.config.ts                      # Tailwind CSS design system configuration
├── tsconfig.json                           # TypeScript strict compiler configuration
│
├── sql/
│   ├── schema.sql                          # Idempotent PostgreSQL DDL (users, tokens, sessions, attempts)
│   └── migrations/
│       └── 001_create_auth_schema.sql      # Versioned auth schema migration
│
├── scripts/
│   ├── migrate.ts                          # Migration runner (applies sql/schema.sql via direct connection)
│   └── test-db.ts                          # Diagnostic utility verifying PostgreSQL connectivity and tables
│
├── src/
│   ├── middleware.ts                       # Edge middleware: instant redirect of unauthenticated /dashboard traffic
│   ├── app/
│   │   ├── globals.css                     # Global design tokens and Tailwind base styles
│   │   ├── layout.tsx                      # Root layout with Navbar, Footer, and theme wrappers
│   │   ├── page.tsx                        # Public landing page with architectural overview & feature grid
│   │   ├── login/
│   │   │   └── page.tsx                    # Login view rendering LoginForm
│   │   ├── verify/
│   │   │   └── page.tsx                    # Verification landing page rendering VerifyView
│   │   ├── dashboard/
│   │   │   └── page.tsx                    # Server Component: queries DB for valid session, redirects if invalid
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── request-link/route.ts   # POST: validates identifier, checks rate limit, generates token, sends link
│   │       │   ├── verify/route.ts         # POST: atomically consumes token, creates session, sets HTTP-only cookie
│   │       │   ├── session/route.ts        # GET: retrieves authenticated user and session metadata
│   │       │   └── logout/route.ts         # POST: marks session revoked_at in DB and clears auth cookie
│   │       └── dev/
│   │           └── demo-events/route.ts    # GET/DELETE: development-only inspection of demo link dispatches
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── login-form.tsx              # Email login form, cooldown timer, demo preview
│   │   │   └── verify-view.tsx             # 6-state verification view (verifying, success, invalid, expired, already_used, error)
│   │   ├── dashboard/
│   │   │   └── dashboard-view.tsx          # Authenticated dashboard UI, user ID copy, session timer, audit checklist
│   │   ├── layout/
│   │   │   ├── navbar.tsx                  # Header with system navigation and status indicator
│   │   │   └── footer.tsx                  # Footer with project context and security notices
│   │   └── ui/
│   │       ├── alert.tsx                   # Accessible alert banner component
│   │       ├── badge.tsx                   # Visual badge chips with status variants
│   │       ├── button.tsx                  # Accessible button with loading spinners and variants
│   │       ├── card.tsx                    # Card layout primitives (Header, Title, Description, Content, Footer)
│   │       └── input.tsx                   # Input field with label, icon, helper text, and error states
│   │
│   ├── hooks/
│   │   └── use-mounted.ts                  # React hydration helper hook
│   │
│   ├── lib/
│   │   ├── constants.ts                    # Global constants: APP_CONFIG, TTL durations, cookie names
│   │   ├── utils.ts                        # Styling utility (cn / clsx / tailwind-merge)
│   │   ├── auth/
│   │   │   ├── errors.ts                   # Custom error classes (AuthError, ValidationError, TokenExpiredError, etc.)
│   │   │   ├── index.ts                    # Public auth module re-exports
│   │   │   ├── security.ts                 # hashClientIp (salted SHA-256) and verifyCsrfOrigin checks
│   │   │   ├── session.ts                  # Session token generation, SHA-256 hashing, cookie configs, verification
│   │   │   ├── token.ts                    # Magic token generation (256-bit), SHA-256 hashing, timingSafeCompare, atomic consume
│   │   │   ├── user.ts                     # User identity resolution and creation
│   │   │   └── validation.ts               # Zod validation schemas for email and token format
│   │   ├── db/
│   │   │   ├── index.ts                    # postgres.js client singleton with connection pooling and HMR cache
│   │   │   ├── test-connection.ts          # Diagnostic queries for test-db script
│   │   │   ├── types.ts                    # Database row interfaces and domain entity mappers
│   │   │   └── queries/
│   │   │       ├── attempts.ts             # recordAttempt, checkRateLimit (sliding window SQL queries)
│   │   │       ├── index.ts                # Query module re-exports
│   │   │       ├── sessions.ts             # createSession, findValidSessionWithUser, revokeSession, revokeAllUserSessions
│   │   │       ├── tokens.ts               # createAuthToken, findValidAuthToken, consumeAuthTokenAtomically, deleteExpiredTokens
│   │   │       └── users.ts                # findUserById, findUserByEmail, findUserByPhone, findOrCreateUser
│   │   ├── demo/
│   │   │   └── index.ts                    # Safe in-memory demo ring buffer, production guard, console card logger
│   │   └── messaging/
│   │       ├── email.ts                    # Nodemailer SMTP transporter, HTML/Text email renderers, maskEmail
│   │       ├── index.ts                    # Unified sendMagicLink dispatcher with demo-mode fallbacks
│   │
│   └── types/
│       ├── auth.ts                         # Domain TypeScript types (User, AuthToken, Session, AuthChannel, etc.)
│       └── nav.ts                          # Navigation item interfaces
│
└── tests/
    ├── demo-mode.test.ts                   # 5 invariants: production isolation, dev enablement, sendMagicLink dispatch
    ├── e2e-workflow.test.ts                # Complete  end-to-end authentication lifecycle verification
    ├── expiration-and-single-use.test.ts   # Token expiration horizon, atomic single-use state, session hashing & cookies
    ├── messaging.test.ts                   # Nodemailer SMTP delivery, template rendering, PII masking
    ├── security-audit.test.ts              # IP hashing privacy, CSRF Origin validation, git hygiene
    ├── session-protection.test.ts          # Server-side route protection: anonymous, authenticated, expired, revoked, invalid
    ├── token.test.ts                       # CSPRNG entropy, uniqueness, SHA-256 hashing, timingSafeEqual
    └── validation.test.ts                  # Zod validation: RFC email normalization, removed-channel rejection, token regex
```

---

## 4. Database Ledger & Schema Design

PostgreSQL manages four relational tables defined in `sql/schema.sql`:

### 1. `users` Table

- `id` (UUID PK, `gen_random_uuid()`): Unique user ID
- `email` (VARCHAR(255) UNIQUE NULL): Normalized lowercase email address
- `phone` (VARCHAR(32) UNIQUE NULL): E.164 international phone number (`+<country><number>`)
- `created_at` (TIMESTAMPTZ, `DEFAULT NOW()`): Creation timestamp
- `updated_at` (TIMESTAMPTZ, `DEFAULT NOW()`): Managed by `trg_users_updated_at` trigger
- **Constraint:** `chk_user_identifier` enforces that at least one of `email` or `phone` is non-null and non-empty.
- **Indexes:** Partial B-tree indexes on `email` and `phone` WHERE NOT NULL.

### 2. `auth_tokens` Table

- `id` (UUID PK, `gen_random_uuid()`)
- `user_id` (UUID FK -> `users(id)` ON DELETE CASCADE NULL)
- `token_hash` (VARCHAR(64) NOT NULL UNIQUE): SHA-256 hexadecimal digest of raw 256-bit magic token
- `expires_at` (TIMESTAMPTZ NOT NULL): Default 10 minutes from creation
- `used_at` (TIMESTAMPTZ NULL): Consumed timestamp; strictly NULL until claimed
- `created_at` (TIMESTAMPTZ, `DEFAULT NOW()`)
- **Indexes:** B-tree on `token_hash`, FK index on `user_id`, partial index on `(expires_at, used_at) WHERE used_at IS NULL`.

### 3. `sessions` Table

- `id` (UUID PK, `gen_random_uuid()`)
- `user_id` (UUID NOT NULL FK -> `users(id)` ON DELETE CASCADE)
- `session_token_hash` (VARCHAR(64) NOT NULL UNIQUE): SHA-256 hexadecimal digest of raw session cookie secret
- `expires_at` (TIMESTAMPTZ NOT NULL): Default 7 days from creation
- `created_at` (TIMESTAMPTZ, `DEFAULT NOW()`)
- `revoked_at` (TIMESTAMPTZ NULL): Set to `NOW()` upon logout; NULL while active
- **Indexes:** B-tree on `session_token_hash`, B-tree on `user_id`, partial index on `(expires_at, revoked_at) WHERE revoked_at IS NULL`.

### 4. `authentication_attempts` Table

- `id` (UUID PK, `gen_random_uuid()`)
- `email` (VARCHAR(255) NULL)
- `phone` (VARCHAR(32) NULL)
- `ip_hash` (VARCHAR(64) NOT NULL): Salted SHA-256 digest of client IP (`hashClientIp`)
- `success` (BOOLEAN NOT NULL DEFAULT false)
- `created_at` (TIMESTAMPTZ, `DEFAULT NOW()`)
- **Constraint:** `chk_attempt_target` ensures either `email` or `phone` is non-null.
- **Indexes:** Compound index on `(ip_hash, created_at DESC)`, partial indexes on `(email, created_at DESC)` and `(phone, created_at DESC)`.

---

## 5. Security Architecture & Threat Mitigations

| Threat Vector                        | Severity | Mitigation Implemented                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Token Brute-Forcing**              | Critical | 256-bit CSPRNG entropy ($2^{256}$ space) generated via `crypto.randomBytes(32)`; rate-limited to 30 verify attempts per 15 mins per IP hash.                                                                                                                                                                                       |
| **Database Dump Compromise**         | Critical | **Zero plaintext tokens or session secrets at rest**. Only SHA-256 digests exist in PostgreSQL. Stolen database dumps cannot be used to authenticate.                                                                                                                                                                              |
| **Token Replay / Race Conditions**   | Critical | **Atomic conditional SQL update**: `UPDATE auth_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() RETURNING *`. Postgres row locks ensure only one caller succeeds.                                                                                                                      |
| **Email Scanner Invalidation**       | High     | Corporate email filters (Microsoft Defender SafeLinks, Gmail Anti-Spam) make automated `GET` requests to inspect links. In this system, `GET /verify?token=...` only renders the UI. The token is consumed solely upon an explicit client `POST /api/auth/verify`.                                                                 |
| **XSS Session Hijacking**            | High     | Session tokens stored strictly in HTTP-only cookies (`auth_session`). JavaScript (`document.cookie`, `localStorage`, `sessionStorage`) cannot access the token.                                                                                                                                                                    |
| **Unauthenticated Dashboard Access** | High     | Two-tier defense: (1) Edge Middleware (`src/middleware.ts`) bounces missing cookies to `/login?from=/dashboard`; (2) Async Server Component (`src/app/dashboard/page.tsx`) queries PostgreSQL, verifies SHA-256 session hash, and validates expiry/revocation before streaming HTML. Zero token props passed to client components. |
| **CSRF / Cross-Site Mutation**       | Medium   | `verifyCsrfOrigin` checks exact `Origin` vs `Host` parity on `POST /api/auth/request-link`, `POST /api/auth/verify`, and `POST /api/auth/logout`. Session cookies use `SameSite=Lax`.                                                                                                                                              |
| **User Enumeration**                 | Medium   | Uniform generic response from `/api/auth/request-link`: `"If the provided details are valid, a temporary magic link has been dispatched."` regardless of whether the user previously existed.                                                                                                                                      |
| **PII & IP Privacy Compliance**      | Low      | Client IPs are hashed with a secret salt (`MAGIC_LINK_SECRET`) prior to DB storage (`hashClientIp`). Log messages mask email (`st***t@college.edu`).                                                                                                                                                                               |
| **Timing Attacks**                   | Low      | Constant-time digest comparison using `crypto.timingSafeEqual` in `timingSafeCompare`.                                                                                                                                                                                                                                             |
| **Security Headers**                 | Low      | Hardened headers in `next.config.mjs`: HSTS (`max-age=31536000`), CSP (`default-src 'self'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.                                                                                                |

---

## 6. Authentication Lifecycle Details

### Phase 1: Magic Link Request (`POST /api/auth/request-link`)

1. **CSRF Validation:** Compares request `Origin` header against `Host`.
2. **Input Normalization:** Zod schema validates and normalizes RFC 5322 email (trimmed, lowercase).
3. **Client IP Anonymization:** Reads `x-forwarded-for` / `x-real-ip` and computes `hashClientIp(clientIp)`.
4. **Rate Limit Check:** Queries `authentication_attempts` in a 15-minute window (limit: 5/identifier, 15/IP). Returns HTTP 429 if exceeded.
5. **Identity Provisioning:** Calls `getOrCreateUserByIdentifier` in PostgreSQL `users` table.
6. **Token Generation:** Generates 32 random bytes (64 hex characters) and computes SHA-256 hash.
7. **Database Storage:** Inserts `token_hash`, `user_id`, and `expires_at` (10 minutes) into `auth_tokens`.
8. **Provider Dispatch:**
   - **Email:** Dispatches responsive HTML and plain-text email via Nodemailer SMTP.
   - **Demo Mode:** If `DEMO_MODE=true` in development, logs console card, records in-memory event, and includes `demoLink` in JSON response.
9. **Telemetry:** Logs success attempt in `authentication_attempts` and returns uniform 200 OK.

### Phase 2: Token Verification & Session Creation (`POST /api/auth/verify`)

1. **CSRF & IP Rate Limit:** Verifies Origin and limits verification requests to 30 per 15 minutes per IP.
2. **Token Format Validation:** Zod validates 32-128 character hex/URL-safe token.
3. **Atomic Consumption:** Executes conditional SQL query:
   ```sql
   UPDATE auth_tokens
   SET used_at = NOW()
   WHERE token_hash = $1
     AND used_at IS NULL
     AND expires_at > NOW()
   RETURNING id, user_id, token_hash, expires_at, used_at, created_at;
   ```
4. **State Classification on Failure:** If 0 rows returned, queries `findAnyAuthToken` to classify exact error state: `already_used`, `expired`, or `invalid`.
5. **Session Creation:** Generates 256-bit raw session token, computes SHA-256 hash, and inserts into `sessions` table (7-day TTL).
6. **Hardened Cookie Set:** Attaches `auth_session` cookie: `HttpOnly=true`, `SameSite=Lax`, `Secure=(NODE_ENV === "production")`, `Path="/"`, `Max-Age=604800`.
7. **Client Response:** Returns `{ success: true, state: "success", redirectUrl: "/dashboard" }`.

### Phase 3: Protected Route Authorization (`/dashboard`)

1. **Edge Middleware (`src/middleware.ts`):** Fast check on `auth_session` cookie. Redirects immediately to `/login?from=/dashboard` if missing.
2. **Server Component (`src/app/dashboard/page.tsx`):** Reads cookie, hashes with SHA-256, and executes SQL join:
   ```sql
   SELECT s.id, s.user_id, s.expires_at, s.created_at, s.revoked_at,
          u.email, u.phone, u.created_at AS user_created_at
   FROM sessions s
   INNER JOIN users u ON s.user_id = u.id
   WHERE s.session_token_hash = $1
     AND s.revoked_at IS NULL
     AND s.expires_at > NOW()
   LIMIT 1;
   ```
3. **Render View:** If valid, renders `DashboardView` with safe user fields (`id`, `email`, `phone`, `createdAt`). Raw session secrets are never passed.

### Phase 4: Logout (`POST /api/auth/logout`)

1. **CSRF Verification:** Verifies Origin against Host.
2. **Server Revocation:** Updates PostgreSQL `sessions` setting `revoked_at = NOW() WHERE session_token_hash = $1`.
3. **Cookie Clearance:** Sets `auth_session` cookie with empty value, `Max-Age=0`, and `expires=1970-01-01`.

---

## 7. Development Demo Mode Specifications (`src/lib/demo/index.ts`)

- **Strict Production Guard:** `isDemoMode()` checks `if (process.env.NODE_ENV === "production") return false;`. It is mathematically impossible to activate demo mode in production regardless of `DEMO_MODE=true`.
- **Zero Authentication Bypass:** The complete cryptographic pipeline executes in demo mode (256-bit token generation, PostgreSQL SHA-256 storage, 10-minute expiry, single-use atomic update, session creation, and HTTP-only cookie issuance).
- **In-Memory Ring Buffer:** Stores the latest 20 demo dispatch events in memory with 10-minute TTL auto-purging.
- **Terminal Console Card:** Outputs prominent ASCII box containing magic link URL to server console for evaluator convenience.
- **Login UI Preview:** When `demoLink` is returned in development, `/login` displays an interactive preview link to click directly.
- **Protected Dev Endpoint:** `GET /api/dev/demo-events` returns active demo events in development; returns `404 Not Found` in production.

---

## 8. Verification & Test Suite Summary

- **Test Framework:** Node.js native test runner (`node:test`, `node:assert`) via `tsx --env-file=.env --test tests/**/*.test.ts`
- **Total Test Suites:** 22 suites
- **Total Unit & Integration Tests:** **80 tests passed, 0 failures, 0 skipped**
- **TypeScript Typecheck:** `npm run typecheck` (`tsc --noEmit`) passes with 0 errors
- **ESLint Linting:** `npm run lint` passes with 0 warnings/errors
- **Production Compilation:** `npm run build` succeeds (12/12 static and dynamic routes compiled cleanly)
- **Dependency Audit:** Clean, 0 vulnerabilities (`npm audit` clean, PostCSS override applied)

### Test Suites Breakdown:

1. `tests/demo-mode.test.ts`: Production isolation, dev activation, sendMagicLink integration, zero leak in production.
2. `tests/token.test.ts`: 256-bit entropy, uniqueness across 500 iterations, SHA-256 deterministic hashing, collision resistance, timingSafeCompare.
3. `tests/validation.test.ts`: RFC email normalization, malformed email rejection, removed-channel rejection, verify token format regex.
4. `tests/expiration-and-single-use.test.ts`: Expiration boundaries, single-use state transition, simulated atomic claim replay defense, session token hashing, hardened cookie configuration, session expiration/revocation.
5. `tests/messaging.test.ts`: Email masking, HTML & text template exact copy verification, SMTP config validation, Nodemailer sending with mock transporter, email dispatcher and removed-channel rejection.
6. `tests/security-audit.test.ts`: IP hashing determinism and salting, CSRF Origin parity vs cross-site blocking, Git `.gitignore` and `.env` hygiene.
7. `tests/session-protection.test.ts`: Anonymous user rejection, authenticated user resolution, expired session rejection, revoked session rejection, invalid/tampered cookie rejection, cookie security flags.
8. `tests/e2e-workflow.test.ts`: Full simulated end-to-end lifecycle verification (client navigation, validation, token generation, DB persistence, email dispatch, magic link opening, hash verification, session creation, cookie issuance, dashboard authorization, refresh persistence, logout revocation, re-use replay rejection, expired token rejection, invalid token rejection, rate limit check, input error checks).

---

## 9. Environment Configuration Reference

The application requires a root `.env` file (strictly excluded from Git via `.gitignore`):

```env
# Application base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# PostgreSQL Database Connections (Supabase PostgreSQL supported)
# Runtime prioritizes DATABASE_URL and falls back to DIRECT_URL
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/postgres

# Nodemailer SMTP Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM="College IDP Auth <auth@example.com>"

# Salt for privacy-preserving client IP hashing (min 32 characters)
MAGIC_LINK_SECRET=your-cryptographically-secure-random-secret-key-32-chars

# Development Demo Mode (strictly ignored if NODE_ENV=production)
DEMO_MODE=false
```

---

## 10. Operational Runbook & Commands

```bash
# Install dependencies
npm install

# Apply database migrations to Supabase PostgreSQL (creates all 4 tables & indexes)
npm run db:migrate

# Test database connection and table presence
npm run db:test

# Run automated test suite (80 tests across 22 suites)
npm test

# Type-check TypeScript codebase
npm run typecheck

# Lint codebase
npm run lint

# Start development server
npm run dev

# Compile production build
npm run build

# Start production server
npm run start
```

---

## 11. Security Audit Findings & Resolutions (16/16 Resolved)

| #   | Severity     | Finding                                         | Root Cause                                                                                           | Resolution & Files Changed                                                                                                            |
| --- | ------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **CRITICAL** | Verification rate limiting disabled             | `chk_attempt_target` check constraint required email or phone, rejecting IP-only verification events | Removed `chk_attempt_target` in `sql/schema.sql` and `sql/migrations/001_create_auth_schema.sql`                                      |
| 2   | **CRITICAL** | Cryptographic flaw in `timingSafeCompare()`     | `Buffer.from(nonHex, 'hex')` produced 0-byte buffer; comparing two 0-byte buffers returned `true`    | Added `/^[0-9a-fA-F]{64}$/` regex check in `src/lib/auth/token.ts` before buffer conversion                                           |
| 4   | **HIGH**     | Race condition on concurrent user creation      | Two-step `findUserByIdentifier` + `createUser` allowed duplicate insert crash (PostgreSQL 23505)     | Implemented atomic `INSERT ... ON CONFLICT (...) DO UPDATE` in `src/lib/db/queries/users.ts`                                          |
| 5   | **HIGH**     | Host Header / Origin poisoning in magic links   | Fell back to untrusted `req.headers.get("origin")`                                                   | Strictly enforce `process.env.NEXT_PUBLIC_APP_URL` (returns 500 if unset) in `src/app/api/auth/request-link/route.ts`                 |
| 6   | **HIGH**     | Automated email scanners burn single-use tokens | Auto-POST on component mount in `useEffect` triggered by headless scanners                           | Introduced manual "Confirm Sign In" button requiring user interaction in `src/components/auth/verify-view.tsx`                        |
| 7   | **MEDIUM**   | Fail-open rate limiting on DB error             | Catch block logged warning and continued request processing                                          | Return HTTP 503 Service Unavailable (fail-closed) in both `request-link/route.ts` and `verify/route.ts`                               |
| 8   | **MEDIUM**   | Older active tokens not invalidated             | Requesting a new magic link left previously issued unexpired tokens active                           | Added `invalidatePriorTokens(userId)` in `src/lib/db/queries/tokens.ts` called before new token generation in `request-link/route.ts` |
| 9   | **MEDIUM**   | Stale session cookie not cleared on redirect    | RSC `redirect('/login')` did not delete `auth_session` cookie                                        | Added `getClearSessionCookieConfig()` deletion in catch block in `src/app/dashboard/page.tsx`                                         |
| 10  | **MEDIUM**   | API specification discrepancy in API.md         | Documented `sessionId`, `ipAddress`, `userAgent` not present in implementation                       | Updated `API.md` response schemas to match actual server implementation                                                               |
| 12  | **LOW**      | Dead unreachable code in `verifyAuthToken()`    | Unused helper with dead conditionals                                                                 | Removed dead function from `src/lib/auth/token.ts`                                                                                    |
| 13  | **LOW**      | `deleteExpiredTokens()` never scheduled         | Maintenance helper present but unscheduled                                                           | Added documentation note in `src/lib/db/queries/tokens.ts` recommending cron scheduling                                               |
| 14  | **LOW**      | Unused dead modules                             | `useMounted` hook and `NavItem` interface unreferenced                                               | Deleted `src/hooks/use-mounted.ts`, `src/types/nav.ts`, and empty `src/hooks/` folder                                                 |
| 15  | **LOW**      | Overly permissive CSP header                    | CSP contained `'unsafe-eval'` in `script-src`                                                        | Removed `'unsafe-eval'` from `next.config.mjs` Content-Security-Policy                                                                |
| 16  | **LOW**      | Tautological assertion in test suite            | Step 20 checked `5 >= 5`                                                                             | Replaced with boundary assertions (below threshold, at threshold, above threshold) in `tests/e2e-workflow.test.ts`                    |
