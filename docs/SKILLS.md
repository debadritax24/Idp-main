# Operational & Technical Skills: Passwordless Auth IDP

## Technical Domain Guidelines

### 1. Database Operations (Supabase PostgreSQL)

- **Constraint:** Use Supabase strictly as a PostgreSQL host. Never import `@supabase/supabase-js` or invoke Supabase Auth methods.
- **Connection Management:** Use connection pooling for serverless / Route Handler environments via `DIRECT_URL` or pooled `DATABASE_URL`.
- **Atomic Operations:** Always use atomic SQL queries (`UPDATE ... WHERE used_at IS NULL ... RETURNING ...`) for token consumption to prevent race conditions and replay attacks.
- **Indexes:** Ensure all lookups (`token_hash`, `session_token_hash`, `identifier`, `expires_at`) have explicit B-tree indexes.

### 2. Cryptographic Security Standards

- **Token Entropy:** Always use Node.js `crypto.randomBytes(32).toString('hex')` (256 bits of entropy) or URL-safe base64url.
- **Storage Hashing:** Compute SHA-256 digests (`crypto.createHash('sha256').update(token).digest('hex')`) before database writes or queries. Raw tokens never touch disk.
- **Constant-Time Comparison:** When comparing digests in memory, use `crypto.timingSafeEqual`.

### 3. Session & Cookie Policy

- **Cookie Flags:**
  - `HttpOnly`: true (protect against XSS theft)
  - `Secure`: process.env.NODE_ENV === 'production' (transmitted only over HTTPS)
  - `SameSite`: 'lax' (or 'strict' for high-security endpoints, preventing CSRF)
  - `Path`: '/'
  - `Max-Age`: Configurable (e.g. 7 days / 604800 seconds)

### 4. Input Sanitization & Server-side Validation

- **Engine:** Zod schemas.
- **Email:** Standard RFC 5322 validation, lowercased and trimmed.
- **Channel:** Only `email` is supported for login; reject other channel types.
- **Rate Limiting:** Database-tracked sliding window in `authentication_attempts` table.
- **Error Obfuscation:** Generic responses ("If an account exists, a link has been sent") to thwart user enumeration.

### 5. UI/UX Principles

- **Aesthetics:** High-contrast, clean typography (Geist / Inter), subtle borders, dark/light theme support.
- **States:** Clear loading spinners, disable-on-submit, toast/banner feedback, countdown timers for resend cooldown.
