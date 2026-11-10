import db from "@/lib/db";
import { type DbAuthTokenRow, mapDbAuthToken } from "@/lib/db/types";
import type { AuthToken } from "@/types/auth";

export interface CreateAuthTokenInput {
  userId?: string | null;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Stores a cryptographically hashed magic link token.
 * Raw tokens are NEVER persisted to the database.
 */
export async function createAuthToken({
  userId = null,
  tokenHash,
  expiresAt,
}: CreateAuthTokenInput): Promise<AuthToken> {
  const rows = await db<DbAuthTokenRow[]>`
    INSERT INTO auth_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
    RETURNING id, user_id, token_hash, expires_at, used_at, created_at;
  `;
  return mapDbAuthToken(rows[0]);
}

/**
 * Finds an auth token by its SHA-256 hash regardless of used/expired status.
 * Used for detailed status classification upon consumption failure.
 */
export async function findAnyAuthToken(tokenHash: string): Promise<AuthToken | null> {
  const rows = await db<DbAuthTokenRow[]>`
    SELECT id, user_id, token_hash, expires_at, used_at, created_at
    FROM auth_tokens
    WHERE token_hash = ${tokenHash}
    LIMIT 1;
  `;
  return rows[0] ? mapDbAuthToken(rows[0]) : null;
}

/**
 * Finds an auth token by its SHA-256 hash if it is still valid (not expired, not used).
 */
export async function findValidAuthToken(tokenHash: string): Promise<AuthToken | null> {
  const rows = await db<DbAuthTokenRow[]>`
    SELECT id, user_id, token_hash, expires_at, used_at, created_at
    FROM auth_tokens
    WHERE token_hash = ${tokenHash}
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1;
  `;
  return rows[0] ? mapDbAuthToken(rows[0]) : null;
}

/**
 * ATOMIC SINGLE-USE TOKEN CONSUMPTION
 * Atomically marks the token as used (used_at = NOW()) only if:
 * 1. The token_hash matches.
 * 2. It has NOT been used before (used_at IS NULL).
 * 3. It has NOT expired (expires_at > NOW()).
 *
 * This atomic operation completely prevents token replay and concurrency race conditions.
 */
export async function consumeAuthTokenAtomically(tokenHash: string): Promise<AuthToken | null> {
  const rows = await db<DbAuthTokenRow[]>`
    UPDATE auth_tokens
    SET used_at = NOW()
    WHERE token_hash = ${tokenHash}
      AND used_at IS NULL
      AND expires_at > NOW()
    RETURNING id, user_id, token_hash, expires_at, used_at, created_at;
  `;
  return rows[0] ? mapDbAuthToken(rows[0]) : null;
}

/**
 * Invalidates all unconsumed tokens for a specific user.
 * Called before generating a new magic link to prevent concurrent valid tokens.
 */
export async function invalidatePriorTokens(userId: string): Promise<number> {
  const result = await db`
    UPDATE auth_tokens
    SET used_at = NOW()
    WHERE user_id = ${userId}
      AND used_at IS NULL
      AND expires_at > NOW();
  `;
  return result.count;
}

/**
 * Maintenance helper to purge stale expired tokens older than 24 hours.
 * NOTE: This function is not currently invoked on a schedule.
 * Consider calling it from a cron job or scheduled task to prevent unbounded table growth.
 */
export async function deleteExpiredTokens(): Promise<number> {
  const result = await db`
    DELETE FROM auth_tokens
    WHERE expires_at < NOW() - INTERVAL '24 hours';
  `;
  return result.count;
}
