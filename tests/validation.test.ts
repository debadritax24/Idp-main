import { test, describe } from "node:test";
import assert from "node:assert";
import { validateMagicLinkRequest, validateVerifyToken } from "../src/lib/auth/validation";
import { ValidationError } from "../src/lib/auth/errors";

describe("Input Validation & Normalization", () => {
  describe("Email Validation", () => {
    test("accepts and normalizes valid RFC email addresses", () => {
      const validCases = [
        { input: "USER@Example.COM ", expected: "user@example.com" },
        {
          input: "student.dev+tag@college.edu",
          expected: "student.dev+tag@college.edu",
        },
        {
          input: "first.last@dept.sub.college.ac.in",
          expected: "first.last@dept.sub.college.ac.in",
        },
      ];

      for (const { input, expected } of validCases) {
        const result = validateMagicLinkRequest({
          identifier: input,
          type: "email",
        });
        assert.strictEqual(result.normalizedIdentifier, expected);
        assert.strictEqual(result.type, "email");
      }
    });

    test("rejects malformed email addresses", () => {
      const invalidEmails = [
        "not-an-email",
        "@missing-user.com",
        "missing-domain@",
        "spaces in@domain.com",
        "",
      ];

      for (const email of invalidEmails) {
        assert.throws(
          () => validateMagicLinkRequest({ identifier: email, type: "email" }),
          ValidationError
        );
      }
    });
  });

  test("rejects the removed SMS channel regardless of identifier", () => {
    for (const identifier of ["+14155552671", "student@college.edu"]) {
      assert.throws(() => validateMagicLinkRequest({ identifier, type: "sms" }), ValidationError);
    }
  });

  describe("Verify Token Validation", () => {
    test("accepts valid hex/url-safe tokens", () => {
      const validToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const result = validateVerifyToken({ token: validToken });
      assert.strictEqual(result.token, validToken);
    });

    test("rejects short or empty tokens", () => {
      assert.throws(() => validateVerifyToken({ token: "too-short" }), ValidationError);
      assert.throws(() => validateVerifyToken({ token: "" }), ValidationError);
    });
  });
});
