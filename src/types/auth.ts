/**
 * Channel used for dispatching magic links.
 */
export type AuthChannel = "email";

/**
 * Normalized User record structure.
 * Represents an authenticated principal identity.
 */
export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cryptographically hashed authentication token record.
 * Raw tokens are NEVER stored in the database.
 */
export interface AuthToken {
  id: string;
  userId: string | null;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

/**
 * Authenticated user session record.
 * Stores SHA-256 hash of the session secret stored in the HTTP-only cookie.
 */
export interface Session {
  id: string;
  userId: string;
  sessionTokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
}

/**
 * Authentication attempt tracking record for rate limiting and auditing.
 * Client IP addresses are stored exclusively as SHA-256 hashes for privacy compliance.
 */
export interface AuthenticationAttempt {
  id: string;
  email: string | null;
  phone: string | null;
  ipHash: string;
  success: boolean;
  createdAt: Date;
}

/**
 * Input DTO for requesting a magic link.
 */
export interface RequestMagicLinkInput {
  identifier: string;
  type: AuthChannel;
}

/**
 * Input DTO for verifying a magic link token.
 */
export interface VerifyTokenInput {
  token: string;
}

/**
 * Generic API Response wrapper.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
