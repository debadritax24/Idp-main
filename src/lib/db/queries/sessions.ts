import db from "@/lib/db";
import { type DbSessionRow, mapDbSession, type DbUserRow, mapDbUser } from "@/lib/db/types";
import type { Session, User } from "@/types/auth";

export interface CreateSessionInput {
  userId: string;
  sessionTokenHash: string;
  expiresAt: Date;
}

export interface SessionWithUser {
  session: Session;
  user: User;
}

/**
 * Creates an authenticated session record.
 * Raw session tokens are NEVER stored; only their SHA-256 digests are persisted.
 */
export async function createSession({
  userId,
  sessionTokenHash,
  expiresAt,
}: CreateSessionInput): Promise<Session> {
  const rows = await db<DbSessionRow[]>`
    INSERT INTO sessions (user_id, session_token_hash, expires_at)
    VALUES (${userId}, ${sessionTokenHash}, ${expiresAt.toISOString()})
    RETURNING id, user_id, session_token_hash, expires_at, created_at, revoked_at;
  `;
  return mapDbSession(rows[0]);
}

export interface SessionWithUserJoinRow extends DbSessionRow {
  email: string | null;
  phone: string | null;
  user_created_at: Date | string;
  user_updated_at: Date | string;
}

/**
 * Finds an active, valid session by its SHA-256 session token hash.
 * Joins with the users table to return the associated authenticated user entity.
 */
export async function findValidSessionWithUser(
  sessionTokenHash: string
): Promise<SessionWithUser | null> {
  const rows = await db<SessionWithUserJoinRow[]>`
    SELECT 
      s.id, s.user_id, s.session_token_hash, s.expires_at, s.created_at, s.revoked_at,
      u.email, u.phone, u.created_at AS user_created_at, u.updated_at AS user_updated_at
    FROM sessions s
    INNER JOIN users u ON s.user_id = u.id
    WHERE s.session_token_hash = ${sessionTokenHash}
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
    LIMIT 1;
  `;

  if (!rows[0]) return null;

  const raw = rows[0];
  const session = mapDbSession({
    id: raw.id,
    user_id: raw.user_id,
    session_token_hash: raw.session_token_hash,
    expires_at: raw.expires_at,
    created_at: raw.created_at,
    revoked_at: raw.revoked_at,
  });

  const user = mapDbUser({
    id: raw.user_id,
    email: raw.email,
    phone: raw.phone,
    created_at: raw.user_created_at,
    updated_at: raw.user_updated_at,
  });

  return { session, user };
}

/**
 * Revokes a session immediately on the server.
 */
export async function revokeSession(sessionTokenHash: string): Promise<boolean> {
  const rows = await db`
    UPDATE sessions
    SET revoked_at = NOW()
    WHERE session_token_hash = ${sessionTokenHash}
      AND revoked_at IS NULL
    RETURNING id;
  `;
  return rows.length > 0;
}

/**
 * Revokes all active sessions for a specific user (e.g. global logout).
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const rows = await db`
    UPDATE sessions
    SET revoked_at = NOW()
    WHERE user_id = ${userId}
      AND revoked_at IS NULL
    RETURNING id;
  `;
  return rows.length;
}
