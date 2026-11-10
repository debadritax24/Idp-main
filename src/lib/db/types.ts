import type { User, AuthToken, Session, AuthenticationAttempt } from "@/types/auth";

/**
 * Raw PostgreSQL database row representations (matching SQL schema column names).
 */
export interface DbUserRow {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface DbAuthTokenRow {
  id: string;
  user_id: string | null;
  token_hash: string;
  expires_at: Date | string;
  used_at: Date | string | null;
  created_at: Date | string;
}

export interface DbSessionRow {
  id: string;
  user_id: string;
  session_token_hash: string;
  expires_at: Date | string;
  created_at: Date | string;
  revoked_at: Date | string | null;
}

export interface DbAuthenticationAttemptRow {
  id: string;
  email: string | null;
  phone: string | null;
  ip_hash: string;
  success: boolean;
  created_at: Date | string;
}

/**
 * Mappers from raw PostgreSQL database rows to domain models.
 */
export function mapDbUser(row: DbUserRow): User {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapDbAuthToken(row: DbAuthTokenRow): AuthToken {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: new Date(row.expires_at),
    usedAt: row.used_at ? new Date(row.used_at) : null,
    createdAt: new Date(row.created_at),
  };
}

export function mapDbSession(row: DbSessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    sessionTokenHash: row.session_token_hash,
    expiresAt: new Date(row.expires_at),
    createdAt: new Date(row.created_at),
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
  };
}

export function mapDbAttempt(row: DbAuthenticationAttemptRow): AuthenticationAttempt {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    ipHash: row.ip_hash,
    success: row.success,
    createdAt: new Date(row.created_at),
  };
}
