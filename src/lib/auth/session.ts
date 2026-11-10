import crypto from "crypto";
import { APP_CONFIG } from "@/lib/constants";
import * as sessionQueries from "@/lib/db/queries/sessions";
import type { Session, User } from "@/types/auth";
import { InvalidSessionError } from "./errors";

export const SESSION_COOKIE_NAME = APP_CONFIG.auth.sessionCookieName || "auth_session";

/**
 * Generates a cryptographically secure, 256-bit random session secret.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes a deterministic SHA-256 hexadecimal digest of a raw session secret.
 * Raw session tokens are NEVER stored in the database.
 */
export function hashSessionToken(rawSessionToken: string): string {
  if (!rawSessionToken || typeof rawSessionToken !== "string") {
    throw new InvalidSessionError("Session secret must be a non-empty string.");
  }
  return crypto.createHash("sha256").update(rawSessionToken.trim()).digest("hex");
}

export interface SessionCookieOptions {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  expires: Date;
  maxAge: number;
}

/**
 * Returns security-hardened HTTP-only cookie configuration.
 */
export function getSessionCookieConfig(rawToken: string, expiresAt: Date): SessionCookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  const maxAgeSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

  return {
    name: SESSION_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: maxAgeSeconds,
  };
}

/**
 * Returns cookie clearing configuration to purge session cookie upon logout.
 */
export function getClearSessionCookieConfig(): SessionCookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  };
}

export interface CreatedSessionResult {
  session: Session;
  rawSessionToken: string;
  cookieOptions: SessionCookieOptions;
}

/**
 * Creates an authenticated user session stored server-side.
 * Generates a raw token, hashes it with SHA-256, and writes only the hash to PostgreSQL.
 *
 * RETURNS the raw token and cookie configuration to set in the HTTP response.
 */
export async function createSession(
  userId: string,
  expiresInDays = APP_CONFIG.auth.sessionExpiryDays
): Promise<CreatedSessionResult> {
  const rawSessionToken = generateSessionToken();
  const sessionTokenHash = hashSessionToken(rawSessionToken);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const session = await sessionQueries.createSession({
    userId,
    sessionTokenHash,
    expiresAt,
  });

  const cookieOptions = getSessionCookieConfig(rawSessionToken, expiresAt);

  return {
    session,
    rawSessionToken,
    cookieOptions,
  };
}

export interface AuthenticatedSessionContext {
  session: Session;
  user: User;
}

/**
 * Retrieves the current session and associated user identity from a raw session secret.
 * Rejects expired or revoked sessions.
 */
export async function getCurrentSession(
  rawSessionToken: string
): Promise<AuthenticatedSessionContext> {
  if (!rawSessionToken) {
    throw new InvalidSessionError("No session token provided.");
  }

  const sessionTokenHash = hashSessionToken(rawSessionToken);
  const result = await sessionQueries.findValidSessionWithUser(sessionTokenHash);

  if (!result) {
    throw new InvalidSessionError("Session is invalid, revoked, or expired.");
  }

  if (result.session.revokedAt) {
    throw new InvalidSessionError("Session has been revoked.");
  }

  if (new Date() > new Date(result.session.expiresAt)) {
    throw new InvalidSessionError("Session has expired.");
  }

  return result;
}

/**
 * Revokes a session on the server by marking its revoked_at timestamp.
 */
export async function revokeSession(rawSessionToken: string): Promise<boolean> {
  if (!rawSessionToken) return false;
  const sessionTokenHash = hashSessionToken(rawSessionToken);
  return sessionQueries.revokeSession(sessionTokenHash);
}

/**
 * Revokes all active sessions for a user (e.g. global logout).
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  return sessionQueries.revokeAllUserSessions(userId);
}
