import crypto from "crypto";
import { APP_CONFIG } from "@/lib/constants";
import * as tokenQueries from "@/lib/db/queries/tokens";
import type { AuthToken } from "@/types/auth";
import { InvalidTokenError, TokenExpiredError, TokenAlreadyUsedError } from "./errors";

/**
 * Generates a cryptographically secure, high-entropy 256-bit random token.
 * 32 bytes = 256 bits of entropy = 64 hexadecimal characters.
 */
export function generateMagicToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes a deterministic SHA-256 hexadecimal digest of a raw token.
 * SHA-256 produces a 64-character lowercase hex string.
 *
 * Raw tokens must NEVER be stored in the database or logged.
 */
export function hashToken(rawToken: string): string {
  if (!rawToken || typeof rawToken !== "string") {
    throw new InvalidTokenError("Token must be a non-empty string.");
  }
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

/**
 * Performs a timing-safe equality check on two hex digests to prevent side-channel timing attacks.
 * Rejects non-hex or incorrectly sized digests before comparison.
 */
export function timingSafeCompare(digestA: string, digestB: string): boolean {
  if (!digestA || !digestB) return false;
  const HEX_64_REGEX = /^[0-9a-fA-F]{64}$/;
  if (!HEX_64_REGEX.test(digestA) || !HEX_64_REGEX.test(digestB)) return false;
  const bufA = Buffer.from(digestA, "hex");
  const bufB = Buffer.from(digestB, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export interface CreateAuthTokenOptions {
  userId?: string | null;
  rawToken?: string;
  expiresInMinutes?: number;
}

export interface GeneratedTokenResult {
  rawToken: string;
  tokenHash: string;
  authToken: AuthToken;
}

/**
 * Creates and persists a hashed authentication token record.
 * Generates a fresh 256-bit token if one is not provided.
 *
 * RETURNS the raw token so it can be transmitted ONCE via Email.
 * The raw token is NEVER written to the database.
 */
export async function createAuthToken({
  userId = null,
  rawToken = generateMagicToken(),
  expiresInMinutes = APP_CONFIG.auth.tokenExpiryMinutes,
}: CreateAuthTokenOptions = {}): Promise<GeneratedTokenResult> {
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const authToken = await tokenQueries.createAuthToken({
    userId,
    tokenHash,
    expiresAt,
  });

  return {
    rawToken,
    tokenHash,
    authToken,
  };
}

/**
 * ATOMIC SINGLE-USE TOKEN CONSUMPTION
 * Atomically transitions the token state:
 * `used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`
 *
 * Guarantees that even if multiple requests arrive simultaneously with the same token,
 * exactly one request claims the token and proceeds.
 */
export async function consumeAuthToken(rawToken: string): Promise<AuthToken> {
  const tokenHash = hashToken(rawToken);
  const claimedToken = await tokenQueries.consumeAuthTokenAtomically(tokenHash);

  if (!claimedToken) {
    // Check if token existed to classify exact state
    const anyToken = await tokenQueries.findAnyAuthToken(tokenHash);
    if (!anyToken) {
      throw new InvalidTokenError("Invalid link");
    }
    if (anyToken.usedAt) {
      throw new TokenAlreadyUsedError("Already used link");
    }
    if (new Date() > new Date(anyToken.expiresAt)) {
      throw new TokenExpiredError("Expired link");
    }
    throw new InvalidTokenError("Invalid link");
  }

  return claimedToken;
}
