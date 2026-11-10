import db from "@/lib/db";
import { type DbAuthenticationAttemptRow, mapDbAttempt } from "@/lib/db/types";
import type { AuthenticationAttempt } from "@/types/auth";

export interface RecordAttemptInput {
  email?: string | null;
  phone?: string | null;
  ipHash: string;
  success: boolean;
}

export interface CheckRateLimitInput {
  email?: string | null;
  phone?: string | null;
  ipHash: string;
  maxAttemptsPerIdentifier?: number;
  maxAttemptsPerIp?: number;
  windowMinutes?: number;
}

export interface RateLimitResult {
  isLimited: boolean;
  reason?: "identifier_limited" | "ip_limited";
  identifierAttempts: number;
  ipAttempts: number;
  retryAfterSeconds?: number;
}

/**
 * Records an authentication attempt for auditing, telemetry, and rate limiting.
 * IP addresses are hashed using SHA-256 for privacy compliance.
 */
export async function recordAttempt({
  email = null,
  phone = null,
  ipHash,
  success,
}: RecordAttemptInput): Promise<AuthenticationAttempt> {
  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const normalizedPhone = phone ? phone.trim() : null;

  const rows = await db<DbAuthenticationAttemptRow[]>`
    INSERT INTO authentication_attempts (email, phone, ip_hash, success)
    VALUES (${normalizedEmail}, ${normalizedPhone}, ${ipHash}, ${success})
    RETURNING id, email, phone, ip_hash, success, created_at;
  `;
  return mapDbAttempt(rows[0]);
}

/**
 * Checks sliding-window rate limits for both the identifier (email/phone) and the client IP.
 */
export async function checkRateLimit({
  email,
  phone,
  ipHash,
  maxAttemptsPerIdentifier = 5,
  maxAttemptsPerIp = 15,
  windowMinutes = 15,
}: CheckRateLimitInput): Promise<RateLimitResult> {
  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const normalizedPhone = phone ? phone.trim() : null;
  const windowInterval = `${windowMinutes} minutes`;

  // 1. Check IP rate limit
  const ipCountRows = await db<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM authentication_attempts
    WHERE ip_hash = ${ipHash}
      AND created_at >= NOW() - CAST(${windowInterval} AS INTERVAL);
  `;
  const ipAttempts = parseInt(ipCountRows[0]?.count ?? "0", 10);

  if (ipAttempts >= maxAttemptsPerIp) {
    return {
      isLimited: true,
      reason: "ip_limited",
      identifierAttempts: 0,
      ipAttempts,
      retryAfterSeconds: windowMinutes * 60,
    };
  }

  // 2. Check identifier rate limit (email or phone)
  let identifierAttempts = 0;
  if (normalizedEmail) {
    const emailCountRows = await db<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM authentication_attempts
      WHERE email = ${normalizedEmail}
        AND created_at >= NOW() - CAST(${windowInterval} AS INTERVAL);
    `;
    identifierAttempts = parseInt(emailCountRows[0]?.count ?? "0", 10);
  } else if (normalizedPhone) {
    const phoneCountRows = await db<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM authentication_attempts
      WHERE phone = ${normalizedPhone}
        AND created_at >= NOW() - CAST(${windowInterval} AS INTERVAL);
    `;
    identifierAttempts = parseInt(phoneCountRows[0]?.count ?? "0", 10);
  }

  if (identifierAttempts >= maxAttemptsPerIdentifier) {
    return {
      isLimited: true,
      reason: "identifier_limited",
      identifierAttempts,
      ipAttempts,
      retryAfterSeconds: windowMinutes * 60,
    };
  }

  return {
    isLimited: false,
    identifierAttempts,
    ipAttempts,
  };
}
