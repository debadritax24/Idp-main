<div align="center">

# College IDP

### Passwordless sign-in. Email magic links. PostgreSQL-backed sessions.

A full-stack authentication project built with Next.js and TypeScript. Explore the complete journey from requesting a sign-in link to verifying a token and accessing a protected dashboard.

[![CI](https://github.com/Tushardevx01/Idp/actions/workflows/ci.yml/badge.svg)](https://github.com/Tushardevx01/Idp/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

[Getting started](#getting-started) · [Architecture](docs/ARCHITECTURE.md) · [API reference](docs/API.md) · [Database](docs/DATABASE.md) · [Security](docs/SECURITY.md)

</div>

---

## Overview

College IDP demonstrates email-based authentication without passwords. Users request a temporary magic link, open it from their inbox, and explicitly confirm sign-in. The server consumes the link once, creates a session, and grants access to a protected dashboard.

The application owns its authentication logic. PostgreSQL stores user identities, token hashes, sessions, and authentication attempts; Nodemailer delivers email over SMTP. Supabase can host the database, while authentication remains implemented in this repository.

**Current scope:** email-only login. SMS delivery and phone-based sign-in have been removed. Existing nullable phone fields remain in the database for compatibility with stored records.

## Contents

- [Features](#features)
- [How authentication works](#how-authentication-works)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Commands](#commands)
- [Routes and API](#routes-and-api)
- [Project structure](#project-structure)
- [Testing and validation](#testing-and-validation)
- [Running in production](#running-in-production)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)

## Features

| Area                    | Implementation                                                                          |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| Email sign-in           | HTML and plain-text magic-link emails delivered through SMTP.                           |
| Temporary credentials   | Each magic-link token contains 32 random bytes and expires after 10 minutes.            |
| Single-use verification | A conditional PostgreSQL update claims only an unused, unexpired token.                 |
| Hashed storage          | PostgreSQL stores SHA-256 hashes of magic-link tokens and session secrets.              |
| Server-side sessions    | Seven-day sessions with database-backed expiry and revocation checks.                   |
| Protected dashboard     | Middleware checks cookie presence; the server validates the session against PostgreSQL. |
| Request controls        | Email validation, origin checks, and database-backed rate-limit checks.                 |
| Explicit confirmation   | Opening a link displays a confirmation screen; verification runs after the user clicks. |
| Development previews    | Optional local link previews and in-memory events, disabled in production.              |
| Responsive interface    | Tailwind CSS components with light and dark styling.                                    |

## How authentication works

```mermaid
flowchart LR
    A[Enter email] --> B[Receive magic link]
    B --> C[Open confirmation page]
    C --> D[Confirm sign-in]
    D --> E[Verify and consume token]
    E --> F[Create session]
    F --> G[Access dashboard]
```

1. **Request:** the browser submits an email address to `/api/auth/request-link`.
2. **Issue:** the server validates the request, checks rate limits, resolves the user, and stores a token hash with a 10-minute expiry.
3. **Deliver:** Nodemailer sends a verification URL built from `NEXT_PUBLIC_APP_URL`.
4. **Confirm:** the user opens `/verify?token=...` and clicks **Confirm and Sign In**. A page visit alone does not consume the token.
5. **Authenticate:** the server claims the token, stores a new session hash, and sets the `auth_session` cookie.
6. **Authorize:** the dashboard checks the session against PostgreSQL. Logout revokes the session and clears the cookie.

The cookie uses `HttpOnly`, `SameSite=Lax`, and a root path. `Secure` is enabled when `NODE_ENV=production`. See [Architecture](docs/ARCHITECTURE.md) for component boundaries, concurrency behavior, and implementation limits.

## Technology stack

| Layer        | Technology                      | Role                                                |
| :----------- | :------------------------------ | :-------------------------------------------------- |
| Application  | Next.js 15 App Router, React 19 | Pages, server rendering, and HTTP route handlers    |
| Language     | TypeScript 5                    | Shared types and compile-time checks                |
| Interface    | Tailwind CSS 3, Lucide React    | Styling, reusable components, and icons             |
| Validation   | Zod 4                           | Email and token request validation                  |
| Persistence  | PostgreSQL, `postgres.js`       | Parameterized SQL and connection pooling            |
| Email        | Nodemailer 10                   | SMTP transport and email templates                  |
| Cryptography | Node.js `crypto`                | Random tokens and SHA-256 hashing                   |
| Tests        | Node.js test runner, `tsx`      | TypeScript unit tests and simulated lifecycle tests |
| Automation   | GitHub Actions                  | Lint, typecheck, tests, and production build        |

## Getting started

### 1. Prepare the requirements

Use **Node.js 22** to match the repository's CI environment, with npm available. You will also need a PostgreSQL database and SMTP credentials for a sender you control. The database account must be able to apply [the schema](sql/schema.sql), including its `pgcrypto` extension.

### 2. Install dependencies

```bash
git clone https://github.com/Tushardevx01/Idp.git
cd Idp
npm ci
```

### 3. Configure the environment

Create a `.env` file in the project root:

```dotenv
# Public application URL used to construct verification links
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database: use your provider's actual connection strings
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# SMTP sender
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM="College IDP <auth@example.com>"

# Replace with a randomly generated value
MAGIC_LINK_SECRET=replace-with-a-random-secret

# Keep false for normal email sign-in
DEMO_MODE=false
```

Generate a value for `MAGIC_LINK_SECRET` with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use the SMTP port and TLS mode supplied by your provider. `SMTP_FROM` should use an authorized sender address. Keep database and SMTP credentials server-side and exclude `.env` from version control.

### 4. Initialize and check services

```bash
npm run db:migrate
npm run db:test
npm run email:check
```

- `db:migrate` applies `sql/schema.sql`; it prefers `DIRECT_URL` and falls back to `DATABASE_URL`. Confirm that it reports successful application rather than a skipped migration.
- `db:test` checks database connectivity and the presence of the four authentication tables.
- `email:check` verifies SMTP connectivity and authentication **without sending an email**.

### 5. Start the application

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000), go to **Sign In**, and request a link using an inbox you can access. Open the email, confirm sign-in, and check that the dashboard loads. Log out to verify that the session is revoked.

### Optional: development previews

Set `DEMO_MODE=true` and restart the development server to display a generated-link preview and record local demo events. The mode also prints raw links to the development console, so use it only in a trusted local environment.

SMTP delivery remains required: a failed email send returns an error. Demo mode is always disabled when `NODE_ENV=production`, regardless of the environment variable.

## Environment variables

| Variable              | Purpose                                             | Configuration                                                              |
| :-------------------- | :-------------------------------------------------- | :------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | Base URL for verification links                     | Required for issuing links; use the public HTTPS origin in production.     |
| `DATABASE_URL`        | Primary runtime database connection                 | At least one database URL is required; a provider pooler can be used here. |
| `DIRECT_URL`          | Preferred migration connection and runtime fallback | Set to the direct database connection when available.                      |
| `SMTP_HOST`           | SMTP server hostname                                | Required for email delivery.                                               |
| `SMTP_PORT`           | SMTP server port                                    | Required; use a positive integer.                                          |
| `SMTP_SECURE`         | Enable implicit TLS for the SMTP connection         | Set according to the provider's connection settings.                       |
| `SMTP_USER`           | SMTP authentication username                        | Required.                                                                  |
| `SMTP_PASSWORD`       | SMTP authentication secret                          | Required.                                                                  |
| `SMTP_FROM`           | Email sender name and address                       | Required; use an authorized sender.                                        |
| `MAGIC_LINK_SECRET`   | Salt for hashing client IP addresses                | Configure a random secret, particularly in production.                     |
| `DEMO_MODE`           | Enable local link previews                          | Optional; defaults to inactive and cannot enable previews in production.   |

The runtime client prefers `DATABASE_URL`; the migration script prefers `DIRECT_URL`. Prepared statements are disabled for compatibility with transaction poolers. Production database connections require SSL in the current implementation.

## Commands

| Command                | Purpose                                              |
| :--------------------- | :--------------------------------------------------- |
| `npm run dev`          | Start the development server.                        |
| `npm run build`        | Compile the production application.                  |
| `npm start`            | Serve the compiled production build.                 |
| `npm run lint`         | Run the configured Next.js lint checks.              |
| `npm run typecheck`    | Check TypeScript without emitting application files. |
| `npm test`             | Run automated tests; the script loads `.env`.        |
| `npm run db:migrate`   | Apply the database schema.                           |
| `npm run db:test`      | Check the database connection and expected tables.   |
| `npm run email:check`  | Verify SMTP configuration without sending email.     |
| `npm run db:keepalive` | Run the optional Supabase connectivity helper.       |
| `npm run db:ping`      | Alias for `db:keepalive`.                            |

## Routes and API

### Pages

| Route               | Purpose                                      |
| :------------------ | :------------------------------------------- |
| `/`                 | Project overview and sign-in entry point     |
| `/login`            | Email magic-link request form                |
| `/verify?token=...` | Explicit confirmation and token verification |
| `/dashboard`        | Protected account and session view           |

### HTTP endpoints

| Method           | Endpoint                 | Purpose                                                              |
| :--------------- | :----------------------- | :------------------------------------------------------------------- |
| `POST`           | `/api/auth/request-link` | Validate an email request and deliver a magic link.                  |
| `POST`           | `/api/auth/verify`       | Consume a token and issue a session cookie.                          |
| `GET`            | `/api/auth/session`      | Retrieve the current authenticated session.                          |
| `POST`           | `/api/auth/logout`       | Revoke the current session and clear its cookie.                     |
| `GET` / `DELETE` | `/api/dev/demo-events`   | Inspect or clear local demo events; returns `404` outside demo mode. |

A magic-link request uses the following JSON body:

```json
{
  "identifier": "student@college.edu",
  "type": "email"
}
```

The backend rejects other channel types. See [API.md](docs/API.md) for request and response examples.

## Project structure

```text
Idp/
├── .github/                      # CI/CD and keep-alive GitHub Actions workflows
│   └── workflows/
├── docs/                         # Architecture, API, database & security documentation
│   ├── API.md                    # HTTP API endpoint reference
│   ├── ARCHITECTURE.md           # Components, authentication lifecycle, and limits
│   ├── DATABASE.md               # PostgreSQL schema, indexes, and queries
│   ├── SECURITY.md               # Threat model and security invariants
│   ├── PROJECT_MEMORY.md         # Persistent context and project state
│   └── SKILLS.md                 # Technical standards and domain guidelines
├── public/                       # Static public web assets
├── sql/                          # DDL schemas and database migrations
│   ├── schema.sql                # Schema applied by db:migrate
│   └── migrations/               # Numbered SQL migration files
├── scripts/                      # DevOps, migration, test & heartbeat scripts
├── src/                          # Application source code
│   ├── app/                      # Next.js 15 App Router (pages and API route handlers)
│   ├── components/               # Domain-driven React components
│   │   ├── auth/                 # Login and verification form views
│   │   ├── dashboard/            # Protected user dashboard view
│   │   ├── layout/               # Global shell (Navbar, Footer)
│   │   └── ui/                   # Design system primitives (Button, Card, Input, etc.)
│   ├── config/                   # Centralized application constants & route configs
│   ├── hooks/                    # Reusable client-side React hooks
│   ├── lib/                      # Core business logic & server-side integrations
│   │   ├── auth/                 # Tokens, sessions, hashing, and CSRF/rate limiting
│   │   ├── db/                   # Connection pooler, queries, and row mappers
│   │   ├── messaging/            # SMTP Nodemailer transport & email templates
│   │   └── demo/                 # Local development event buffer
│   ├── types/                    # Shared TypeScript models and API DTOs
│   └── middleware.ts             # Edge middleware for route protection & CSP headers
├── tests/                        # Unit, integration, security audit & E2E test suites
├── .env.example                  # Environment variable configuration template
├── README.md                     # Project overview and getting started guide
└── package.json                  # Dependencies and execution scripts
```

## Testing and validation

Run the same core checks used by CI:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The tests cover token generation and hashing, expiry and single-use behavior, email validation, rejection of removed channels, SMTP handling, session protection, demo-mode isolation, request-origin checks, and security headers.

**Test scope:** lifecycle and delivery tests use mocks or simulated state. A passing suite does not verify a live PostgreSQL deployment, concurrent database transactions, or delivery to a real inbox. Use `db:test`, `email:check`, and the browser sign-in flow to validate a configured environment.

The [CI workflow](.github/workflows/ci.yml) runs on pushes and pull requests to `main` or `master`, and can also be started manually.

## Running in production

Configure the environment on a Node.js host, apply the schema to the intended database, and build the application:

```bash
npm ci
npm run db:migrate
npm run build
npm start
```

Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS origin and keep `DEMO_MODE=false`. The production server enables secure session cookies and requires SSL for its database connection. Ensure the host can reach both PostgreSQL and SMTP.

The repository includes a helper for deleting old expired tokens, but no scheduled cleanup job. Retention and cleanup for authentication records remain deployment responsibilities. Review the [implementation boundaries](docs/ARCHITECTURE.md#implementation-boundaries) when planning a deployment.

## Troubleshooting

| Symptom                                  | What to check                                                                                                       |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| No email arrives                         | Run `email:check`, verify the sender, and inspect spam folders. SMTP acceptance does not guarantee inbox placement. |
| Link points to the wrong host            | Correct `NEXT_PUBLIC_APP_URL`, restart or redeploy, and request a new link.                                         |
| Database is unavailable                  | Check connection strings, network access, SSL requirements, and `db:test` output.                                   |
| Migration reports a skip                 | Replace placeholder credentials and confirm that a database URL is configured.                                      |
| Request returns `429`                    | Wait for the 15-minute accounting window to clear. The form's resend timer is a separate UI control.                |
| Request returns `503`                    | The rate-limit database check failed; inspect connectivity and server logs.                                         |
| Link is expired or already used          | Request a fresh link and confirm it within 10 minutes.                                                              |
| Session cookie is not sent in production | Check that the application is accessed over HTTPS.                                                                  |
| Demo endpoint returns `404`              | It is available only with `DEMO_MODE=true` outside production.                                                      |

## Documentation

| Document                               | Read it for                                                              |
| :------------------------------------- | :----------------------------------------------------------------------- |
| [Architecture](docs/ARCHITECTURE.md)   | System boundaries, authentication sequence, and implementation tradeoffs |
| [API reference](docs/API.md)           | Endpoint payloads and response formats                                   |
| [Database reference](docs/DATABASE.md) | Table definitions, relationships, and indexes                            |
| [Security notes](docs/SECURITY.md)     | Threat model and security-related implementation notes                   |
| [Schema source](sql/schema.sql)        | The SQL executed by the migration command                                |

When changing authentication behavior, update its tests and the corresponding documentation together.
