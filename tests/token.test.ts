import { test, describe } from "node:test";
import assert from "node:assert";
import { generateMagicToken, hashToken, timingSafeCompare } from "../src/lib/auth/token";
import { InvalidTokenError } from "../src/lib/auth/errors";

describe("Token Generation & Cryptographic Hashing", () => {
  test("generateMagicToken produces a 64-character (256-bit) hexadecimal string", () => {
    const token = generateMagicToken();
    assert.strictEqual(typeof token, "string");
    assert.strictEqual(token.length, 64);
    assert.match(token, /^[0-9a-f]{64}$/);
  });

  test("generateMagicToken produces high-entropy unique tokens across sequential invocations", () => {
    const tokens = new Set<string>();
    const iterations = 500;
    for (let i = 0; i < iterations; i++) {
      tokens.add(generateMagicToken());
    }
    // All 500 generated tokens must be distinct
    assert.strictEqual(tokens.size, iterations);
  });

  test("hashToken generates a deterministic 64-character SHA-256 digest", () => {
    const rawToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const hash1 = hashToken(rawToken);
    const hash2 = hashToken(rawToken);

    assert.strictEqual(typeof hash1, "string");
    assert.strictEqual(hash1.length, 64);
    assert.match(hash1, /^[0-9a-f]{64}$/);
    assert.strictEqual(hash1, hash2, "Identical tokens must yield identical hashes");
  });

  test("hashToken produces distinct hashes for distinct tokens (collision resistance)", () => {
    const tokenA = generateMagicToken();
    const tokenB = generateMagicToken();
    const hashA = hashToken(tokenA);
    const hashB = hashToken(tokenB);

    assert.notStrictEqual(hashA, hashB);
  });

  test("hashToken rejects empty or invalid inputs", () => {
    assert.throws(() => hashToken(""), InvalidTokenError);
    // @ts-expect-error Testing invalid runtime input
    assert.throws(() => hashToken(null), InvalidTokenError);
  });

  test("timingSafeCompare returns true for identical digests and false for non-matching digests", () => {
    const token = generateMagicToken();
    const hash = hashToken(token);
    const duplicateHash = hashToken(token);
    const differentHash = hashToken(generateMagicToken());

    assert.strictEqual(timingSafeCompare(hash, duplicateHash), true);
    assert.strictEqual(timingSafeCompare(hash, differentHash), false);
    assert.strictEqual(timingSafeCompare(hash, "invalid_length"), false);
    assert.strictEqual(timingSafeCompare("zzz", "yyy"), false, "Non-hex inputs must return false");
    assert.strictEqual(
      timingSafeCompare(
        "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
        "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
      ),
      false,
      "64-char non-hex inputs must return false"
    );
  });
});
