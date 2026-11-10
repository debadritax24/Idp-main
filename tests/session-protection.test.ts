import { test, describe } from "node:test";
import assert from "node:assert";
import {
  generateSessionToken,
  hashSessionToken,
  getSessionCookieConfig,
  getClearSessionCookieConfig,
} from "../src/lib/auth/session";
import { InvalidSessionError } from "../src/lib/auth/errors";

describe("Protected Routes & Server-Side Session Verification", () => {
  // Mock session entity mimicking the PostgreSQL sessions table joined with users
  interface MockDbSessionRecord {
    id: string;
    userId: string;
    sessionTokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    revokedAt: Date | null;
    user: {
      id: string;
      email: string;
      phone: string | null;
      createdAt: Date;
    };
  }

  // Simulated server-side database session lookup logic matching getCurrentSession()
  function verifySessionServerSide(
    rawCookieToken: string | undefined | null,
    mockStore: Map<string, MockDbSessionRecord>
  ) {
    // 1. Anonymous user check
    if (!rawCookieToken || typeof rawCookieToken !== "string" || !rawCookieToken.trim()) {
      throw new InvalidSessionError("No session token provided.");
    }

    // 2. Hash session token with SHA-256 (Never query raw tokens)
    const tokenHash = hashSessionToken(rawCookieToken);

    // 3. Database lookup
    const record = mockStore.get(tokenHash);
    if (!record) {
      throw new InvalidSessionError("Session is invalid, revoked, or expired.");
    }

    // 4. Revocation check
    if (record.revokedAt !== null) {
      throw new InvalidSessionError("Session has been revoked.");
    }

    // 5. Expiration check
    if (new Date() > new Date(record.expiresAt)) {
      throw new InvalidSessionError("Session has expired.");
    }

    return {
      session: {
        id: record.id,
        userId: record.userId,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt,
      },
      user: record.user,
    };
  }

  test("1. Anonymous user (missing cookie) is strictly rejected", () => {
    const store = new Map<string, MockDbSessionRecord>();

    // No cookie provided
    assert.throws(
      () => verifySessionServerSide(undefined, store),
      (err) => err instanceof InvalidSessionError && err.message === "No session token provided."
    );

    // Empty string cookie
    assert.throws(
      () => verifySessionServerSide("", store),
      (err) => err instanceof InvalidSessionError && err.message === "No session token provided."
    );
  });

  test("2. Authenticated user with valid session succeeds and returns user details", () => {
    const store = new Map<string, MockDbSessionRecord>();
    const rawSecret = generateSessionToken();
    const tokenHash = hashSessionToken(rawSecret);

    const validRecord: MockDbSessionRecord = {
      id: "sess_12345",
      userId: "usr_67890",
      sessionTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
      createdAt: new Date(),
      revokedAt: null,
      user: {
        id: "usr_67890",
        email: "student@college.edu",
        phone: "+14155552671",
        createdAt: new Date(),
      },
    };

    store.set(tokenHash, validRecord);

    const result = verifySessionServerSide(rawSecret, store);
    assert.strictEqual(result.user.id, "usr_67890");
    assert.strictEqual(result.user.email, "student@college.edu");
    assert.strictEqual(result.session.id, "sess_12345");
  });

  test("3. Expired session is detected and rejected server-side", () => {
    const store = new Map<string, MockDbSessionRecord>();
    const rawSecret = generateSessionToken();
    const tokenHash = hashSessionToken(rawSecret);

    const expiredRecord: MockDbSessionRecord = {
      id: "sess_expired",
      userId: "usr_11111",
      sessionTokenHash: tokenHash,
      expiresAt: new Date(Date.now() - 5000), // 5 seconds in the past
      createdAt: new Date(Date.now() - 100000),
      revokedAt: null,
      user: {
        id: "usr_11111",
        email: "expired@college.edu",
        phone: null,
        createdAt: new Date(),
      },
    };

    store.set(tokenHash, expiredRecord);

    assert.throws(
      () => verifySessionServerSide(rawSecret, store),
      (err) => err instanceof InvalidSessionError && err.message === "Session has expired."
    );
  });

  test("4. Revoked session is detected and rejected server-side", () => {
    const store = new Map<string, MockDbSessionRecord>();
    const rawSecret = generateSessionToken();
    const tokenHash = hashSessionToken(rawSecret);

    const revokedRecord: MockDbSessionRecord = {
      id: "sess_revoked",
      userId: "usr_22222",
      sessionTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      revokedAt: new Date(), // Revoked timestamp set upon logout
      user: {
        id: "usr_22222",
        email: "revoked@college.edu",
        phone: null,
        createdAt: new Date(),
      },
    };

    store.set(tokenHash, revokedRecord);

    assert.throws(
      () => verifySessionServerSide(rawSecret, store),
      (err) => err instanceof InvalidSessionError && err.message === "Session has been revoked."
    );
  });

  test("5. Invalid or tampered cookie is rejected server-side", () => {
    const store = new Map<string, MockDbSessionRecord>();
    const tamperedSecret = "random_garbage_cookie_token_9999999999";

    assert.throws(
      () => verifySessionServerSide(tamperedSecret, store),
      (err) =>
        err instanceof InvalidSessionError &&
        err.message === "Session is invalid, revoked, or expired."
    );
  });

  test("Cookie security flags protect against client-side exposure", () => {
    const secret = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const cookie = getSessionCookieConfig(secret, expiresAt);

    // Verifications against client leakage
    assert.strictEqual(cookie.httpOnly, true, "MUST be HttpOnly: inaccessible via document.cookie");
    assert.strictEqual(
      cookie.sameSite,
      "lax",
      "MUST be SameSite=Lax: protected from cross-site requests"
    );
    assert.strictEqual(cookie.path, "/");

    const clearCookie = getClearSessionCookieConfig();
    assert.strictEqual(clearCookie.maxAge, 0);
    assert.strictEqual(clearCookie.value, "");
  });
});
