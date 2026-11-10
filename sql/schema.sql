-- =============================================================================
-- Passwordless Authentication System (College IDP)
-- Database Engine: Supabase PostgreSQL (Pure Database - No Supabase Auth)
-- Idempotent Schema Definition
-- =============================================================================

-- Ensure cryptographic extension for UUID generation is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Represents the principal user identity. Allows authentication via email, phone,
-- or both. Enforces that at least one valid identifier is provided.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NULL,
    phone VARCHAR(32) UNIQUE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_identifier CHECK (
        (email IS NOT NULL AND email <> '') OR 
        (phone IS NOT NULL AND phone <> '')
    )
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. AUTH_TOKENS TABLE
-- Stores cryptographically hashed magic link tokens. Raw tokens are NEVER stored.
-- Enforces single-use consumption and expiration.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 digest in hex (64 chars)
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_active ON auth_tokens(expires_at, used_at) WHERE used_at IS NULL;

-- -----------------------------------------------------------------------------
-- 3. SESSIONS TABLE
-- Stores active user sessions. Raw session cookie tokens are NEVER stored;
-- only their SHA-256 hashes are persisted. Supports instant server-side revocation.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 digest in hex (64 chars)
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_valid ON sessions(expires_at, revoked_at) WHERE revoked_at IS NULL;

-- -----------------------------------------------------------------------------
-- 4. AUTHENTICATION_ATTEMPTS TABLE
-- Tracks authentication attempts for sliding-window rate limiting and intrusion
-- detection. IP addresses are hashed using SHA-256 for privacy compliance.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS authentication_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NULL,
    phone VARCHAR(32) NULL,
    ip_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of client IP
    success BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_ip_hash ON authentication_attempts(ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_email ON authentication_attempts(email, created_at DESC) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attempts_phone ON authentication_attempts(phone, created_at DESC) WHERE phone IS NOT NULL;
