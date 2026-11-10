import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import type { Transporter } from "nodemailer";
import {
  maskEmail,
  renderMagicLinkEmailHtml,
  renderMagicLinkEmailText,
  getSmtpConfig,
  sendMagicLinkEmail,
  setMailTransporter,
  resetMailTransporter,
} from "../src/lib/messaging/email";
import { sendMagicLink } from "../src/lib/messaging/index";
import { AuthError } from "../src/lib/auth/errors";

describe("Messaging Layer: Nodemailer SMTP", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetMailTransporter();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetMailTransporter();
  });

  describe("Identifier Privacy Masking", () => {
    test("maskEmail shields local-part characters while preserving domain", () => {
      assert.strictEqual(maskEmail("student@college.edu"), "st***t@college.edu");
      assert.strictEqual(maskEmail("john.doe@sub.domain.org"), "jo***e@sub.domain.org");
      assert.strictEqual(maskEmail("ab@domain.com"), "a***@domain.com");
    });
  });

  describe("HTML & Text Email Template Rendering (Exact Copy Verification)", () => {
    const mockLink = "https://auth.college.edu/verify?token=7f8a3b2c1d0e";

    test("renderMagicLinkEmailHtml produces compliant HTML containing exact required copy and button", () => {
      const html = renderMagicLinkEmailHtml(mockLink, 10);
      assert.ok(html.includes("<!DOCTYPE html>"));
      assert.ok(html.includes(mockLink));
      assert.ok(html.includes("Your College IDP Login Link"));
      assert.ok(html.includes("College IDP Authentication System"));
      assert.ok(html.includes("You requested to sign in to College IDP."));
      assert.ok(html.includes("Click the button below to securely continue:"));
      assert.ok(html.includes("Login Securely"));
      assert.ok(html.includes("This login link expires in 10 minutes and can only be used once."));
      assert.ok(
        html.includes("If you did not request this login, you can safely ignore this email.")
      );
    });

    test("renderMagicLinkEmailText produces clean plain-text fallback with exact copy", () => {
      const text = renderMagicLinkEmailText(mockLink, 10);
      assert.ok(text.includes(mockLink));
      assert.ok(text.includes("You requested to sign in to College IDP."));
      assert.ok(text.includes("Click the button below to securely continue:"));
      assert.ok(text.includes("This login link expires in 10 minutes and can only be used once."));
      assert.ok(
        text.includes("If you did not request this login, you can safely ignore this email.")
      );
      assert.ok(text.includes("College IDP Authentication System"));
    });
  });

  describe("SMTP Configuration Validation", () => {
    test("throws AuthError (SMTP_CONFIG_ERROR) when environment variables are missing", () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASSWORD;
      delete process.env.SMTP_FROM;

      assert.throws(
        () => getSmtpConfig(),
        (err: unknown) => {
          assert.ok(err instanceof AuthError);
          assert.strictEqual(err.code, "SMTP_CONFIG_ERROR");
          assert.strictEqual(err.statusCode, 500);
          assert.ok(err.message.includes("Missing required environment variables"));
          return true;
        }
      );
    });

    test("throws AuthError (SMTP_CONFIG_ERROR) when SMTP_PORT is non-numeric", () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "invalid_port";
      process.env.SMTP_USER = "user@example.com";
      process.env.SMTP_PASSWORD = "secret_password";
      process.env.SMTP_FROM = "College IDP <user@example.com>";

      assert.throws(
        () => getSmtpConfig(),
        (err: unknown) => {
          assert.ok(err instanceof AuthError);
          assert.strictEqual(err.code, "SMTP_CONFIG_ERROR");
          assert.ok(err.message.includes("SMTP_PORT must be a valid positive integer"));
          return true;
        }
      );
    });

    test("returns parsed configuration when all variables are valid", () => {
      process.env.SMTP_HOST = "smtp.mailprovider.com";
      process.env.SMTP_PORT = "587";
      process.env.SMTP_SECURE = "false";
      process.env.SMTP_USER = "auth@college.edu";
      process.env.SMTP_PASSWORD = "super_secure_smtp_pass";
      process.env.SMTP_FROM = "College IDP <auth@college.edu>";

      const config = getSmtpConfig();
      assert.strictEqual(config.host, "smtp.mailprovider.com");
      assert.strictEqual(config.port, 587);
      assert.strictEqual(config.secure, false);
      assert.strictEqual(config.user, "auth@college.edu");
      assert.strictEqual(config.pass, "super_secure_smtp_pass");
      assert.strictEqual(config.from, "College IDP <auth@college.edu>");
    });
  });

  describe("Nodemailer SMTP Email Sending with Mock Transporter", () => {
    const mockLink = "https://auth.college.edu/verify?token=7f8a3b2c1d0e";

    test("sendMagicLinkEmail dispatches email with correct envelope and returns messageId", async () => {
      let sentMailArgs: Record<string, unknown> | null = null;

      const mockTransporter = {
        sendMail: async (mailOptions: Record<string, unknown>) => {
          sentMailArgs = mailOptions;
          return {
            messageId: "smtp_msg_test_12345",
            accepted: ["student@college.edu"],
            rejected: [],
          };
        },
      } as unknown as Transporter;

      setMailTransporter(mockTransporter);
      process.env.SMTP_FROM = "College IDP <auth@college.edu>";

      const result = await sendMagicLinkEmail("student@college.edu", mockLink);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.messageId, "smtp_msg_test_12345");
      assert.ok(sentMailArgs);
      assert.strictEqual((sentMailArgs as Record<string, unknown>).to, "student@college.edu");
      assert.strictEqual(
        (sentMailArgs as Record<string, unknown>).from,
        "College IDP <auth@college.edu>"
      );
      assert.strictEqual(
        (sentMailArgs as Record<string, unknown>).subject,
        "Your College IDP Login Link"
      );
      assert.ok(typeof (sentMailArgs as Record<string, unknown>).html === "string");
      assert.ok(typeof (sentMailArgs as Record<string, unknown>).text === "string");
    });

    test("sendMagicLinkEmail catches SMTP delivery failure and throws safe AuthError", async () => {
      const mockFailingTransporter = {
        sendMail: async () => {
          throw new Error("SMTP connection ECONNREFUSED 127.0.0.1:587");
        },
      } as unknown as Transporter;

      setMailTransporter(mockFailingTransporter);

      await assert.rejects(
        () => sendMagicLinkEmail("student@college.edu", mockLink),
        (err: unknown) => {
          assert.ok(err instanceof AuthError);
          assert.strictEqual(err.code, "EMAIL_DELIVERY_FAILED");
          assert.strictEqual(err.statusCode, 502);
          assert.ok(err.message.includes("Failed to deliver magic link email via SMTP"));
          return true;
        }
      );
    });

    test("sendMagicLinkEmail rejects missing email or magic link", async () => {
      await assert.rejects(() => sendMagicLinkEmail("", mockLink), /required/i);
      await assert.rejects(() => sendMagicLinkEmail("student@college.edu", ""), /required/i);
    });

    test("does not report delivery when SMTP accepts no recipients", async () => {
      setMailTransporter({
        sendMail: async () => ({
          messageId: "rejected_message",
          accepted: [],
          rejected: ["student@college.edu"],
        }),
      } as unknown as Transporter);

      await assert.rejects(() => sendMagicLinkEmail("student@college.edu", mockLink), {
        code: "EMAIL_DELIVERY_FAILED",
        statusCode: 502,
      });
    });
  });

  describe("Unified sendMagicLink Dispatcher", () => {
    const mockLink = "https://auth.college.edu/verify?token=0123456789abcdef";

    test("dispatches email via Nodemailer and returns masked recipient telemetry", async () => {
      const mockTransporter = {
        sendMail: async () => ({
          messageId: "smtp_msg_unified_001",
          accepted: ["student@college.edu"],
          rejected: [],
        }),
      } as unknown as Transporter;
      setMailTransporter(mockTransporter);

      const result = await sendMagicLink({
        identifier: "student@college.edu",
        type: "email",
        magicLink: mockLink,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.channel, "email");
      assert.strictEqual(result.recipientMasked, "st***t@college.edu");
      assert.strictEqual(result.messageId, "smtp_msg_unified_001");
    });

    test("rejects the removed SMS channel", async () => {
      await assert.rejects(
        () =>
          sendMagicLink({
            identifier: "+14155552671",
            // @ts-expect-error Verify runtime rejection for callers bypassing types.
            type: "sms",
            magicLink: mockLink,
          }),
        (err: unknown) => err instanceof AuthError && err.code === "UNSUPPORTED_CHANNEL"
      );
    });

    test("rejects missing parameters with AuthError", async () => {
      await assert.rejects(
        () =>
          sendMagicLink({
            identifier: "",
            type: "email",
            magicLink: mockLink,
          }),
        AuthError
      );

      await assert.rejects(
        () =>
          sendMagicLink({
            identifier: "student@college.edu",
            type: "email",
            magicLink: "",
          }),
        AuthError
      );
    });

    test("rejects unsupported channel types", async () => {
      await assert.rejects(
        () =>
          sendMagicLink({
            identifier: "student@college.edu",
            // @ts-expect-error Testing invalid runtime channel
            type: "carrier_pigeon",
            magicLink: mockLink,
          }),
        AuthError
      );
    });
  });
});
