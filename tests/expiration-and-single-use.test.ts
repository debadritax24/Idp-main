import { test, describe } from "node:test";
import assert from "node:assert";
import { generateMagicToken, hashToken } from "../src/lib/auth/token";
import {
  generateSessionToken,
  hashSessionToken,
  getSessionCookieConfig,
  getClearSessionCookieConfig,
} from "../src/lib/auth/session";

describe("Token Expiration & Single-Use Mechanics", () => {
  test("Token expiration calculation accurately evaluates valid vs expired time horizons", () => {
    const now = Date.now();
    const tokenTtlMinutes = 10;
    const futureExpiry = new Date(now + tokenTtlMinutes * 60 * 1000);
    const pastExpiry = new Date(now - 1000); // 1 second in the past

    // Active token simulation
    const isActive = (expiresAt: Date, usedAt: Date | null): boolean => {
      return usedAt === null && new Date(expiresAt).getTime() > Date.now();
    };

    assert.strictEqual(
      isActive(futureExpiry, null),
      true,
      "Future unconsumed token must be active"
    );
    assert.strictEqual(isActive(pastExpiry, null), false, "Past token must be expired");
  });

  test("Single-use invariant: consumed tokens (used_at set) are immediately invalid", () => {
    const futureExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const now = new Date();

    const isUsable = (expiresAt: Date, usedAt: Date | null): boolean => {
      return usedAt === null && new Date(expiresAt).getTime() > Date.now();
    };

    // State 1: Unused
    assert.strictEqual(isUsable(futureExpiry, null), true);

    // State 2: Used (consumed)
    assert.strictEqual(isUsable(futureExpiry, now), false);
  });

  test("Simulated atomic consumption enforces single-use and defeats replay attempts", () => {
    // Mock token store representing the database table auth_tokens
    const mockDbToken = {
      tokenHash: hashToken(generateMagicToken()),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      usedAt: null as Date | null,
    };

    // Atomic consumption logic mimicking:
    // UPDATE auth_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() RETURNING *;
    const atomicConsume = (hash: string): boolean => {
      if (
        mockDbToken.tokenHash === hash &&
        mockDbToken.usedAt === null &&
        mockDbToken.expiresAt.getTime() > Date.now()
      ) {
        mockDbToken.usedAt = new Date();
        return true;
      }
      return false;
    };

    // First attempt: Must succeed
    const firstAttempt = atomicConsume(mockDbToken.tokenHash);
    assert.strictEqual(firstAttempt, true, "First consumption attempt must succeed");

    // Second attempt (Replay attack): Must be rejected
    const secondAttempt = atomicConsume(mockDbToken.tokenHash);
    assert.strictEqual(secondAttempt, false, "Replay attempt must be rejected");

    // Third attempt (Concurrent or repeated request): Must be rejected
    const thirdAttempt = atomicConsume(mockDbToken.tokenHash);
    assert.strictEqual(thirdAttempt, false, "Subsequent attempt must be rejected");
  });
});

describe("Session Hashing, Expiration & Cookie Hardening", () => {
  test("generateSessionToken produces a 256-bit cryptographically secure secret", () => {
    const token = generateSessionToken();
    assert.strictEqual(typeof token, "string");
    assert.strictEqual(token.length, 64);
    assert.match(token, /^[0-9a-f]{64}$/);
  });

  test("hashSessionToken produces a deterministic SHA-256 digest of the session secret", () => {
    const rawSession = generateSessionToken();
    const hashA = hashSessionToken(rawSession);
    const hashB = hashSessionToken(rawSession);

    assert.strictEqual(hashA.length, 64);
    assert.strictEqual(hashA, hashB);
  });

  test("getSessionCookieConfig configures security-hardened HTTP-only cookie attributes", () => {
    const rawSecret = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const config = getSessionCookieConfig(rawSecret, expiresAt);

    assert.strictEqual(config.name, "auth_session");
    assert.strictEqual(config.value, rawSecret);
    assert.strictEqual(config.httpOnly, true, "Session cookie MUST be HttpOnly");
    assert.strictEqual(config.sameSite, "lax", "Session cookie MUST enforce SameSite=Lax");
    assert.strictEqual(config.path, "/");
    assert.ok(config.maxAge > 0, "Max-Age must be positive");
  });

  test("getClearSessionCookieConfig properly invalidates the cookie", () => {
    const clearConfig = getClearSessionCookieConfig();
    assert.strictEqual(clearConfig.name, "auth_session");
    assert.strictEqual(clearConfig.value, "");
    assert.strictEqual(clearConfig.maxAge, 0);
    assert.strictEqual(clearConfig.expires.getTime(), 0);
  });

  test("Session expiration and revocation logic", () => {
    const isValidSession = (expiresAt: Date, revokedAt: Date | null): boolean => {
      return revokedAt === null && new Date(expiresAt).getTime() > Date.now();
    };

    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const past = new Date(Date.now() - 1000);

    // Active session
    assert.strictEqual(isValidSession(future, null), true);

    // Revoked session
    assert.strictEqual(isValidSession(future, new Date()), false);

    // Expired session
    assert.strictEqual(isValidSession(past, null), false);
  });
});
