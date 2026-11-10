import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { isDemoMode, recordDemoEvent, getDemoEvents, clearDemoEvents } from "../src/lib/demo";
import { sendMagicLink, setMailTransporter, resetMailTransporter } from "../src/lib/messaging";
import type { Transporter } from "nodemailer";

function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) {
    delete env[key];
  } else {
    env[key] = value;
  }
}

describe("Demo Mode Security Invariants & Safe Dispatch", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDemoMode = process.env.DEMO_MODE;

  beforeEach(() => {
    clearDemoEvents();
    setMailTransporter({
      sendMail: async () => ({
        messageId: "demo_test_smtp_id",
        accepted: ["student@college.edu"],
        rejected: [],
      }),
    } as unknown as Transporter);
  });

  afterEach(() => {
    setEnv("NODE_ENV", originalNodeEnv);
    setEnv("DEMO_MODE", originalDemoMode);
    clearDemoEvents();
    resetMailTransporter();
  });

  it("Invariant 1: Demo mode is IMPOSSIBLE to activate in production", () => {
    setEnv("NODE_ENV", "production");
    setEnv("DEMO_MODE", "true");

    assert.strictEqual(
      isDemoMode(),
      false,
      "isDemoMode must strictly return false in production even if DEMO_MODE is true"
    );

    const recorded = recordDemoEvent({
      identifier: "student@college.edu",
      maskedIdentifier: "st***@college.edu",
      type: "email",
      magicLink: "https://auth.college.edu/verify?token=abc123secret",
    });

    assert.strictEqual(
      recorded,
      null,
      "recordDemoEvent must return null and refuse to store events in production"
    );
    assert.strictEqual(getDemoEvents().length, 0, "getDemoEvents must be empty in production");
  });

  it("Invariant 2: Demo mode evaluates to false when DEMO_MODE is 'false' or unset in development", () => {
    setEnv("NODE_ENV", "development");
    setEnv("DEMO_MODE", "false");
    assert.strictEqual(isDemoMode(), false);

    setEnv("DEMO_MODE", undefined);
    assert.strictEqual(isDemoMode(), false);
  });

  it("Invariant 3: Demo mode evaluates to true only in development when DEMO_MODE='true'", () => {
    setEnv("NODE_ENV", "development");
    setEnv("DEMO_MODE", "true");

    assert.strictEqual(isDemoMode(), true);

    const recorded = recordDemoEvent({
      identifier: "student@college.edu",
      maskedIdentifier: "st***@college.edu",
      type: "email",
      magicLink: "http://localhost:3000/verify?token=demo_token_123",
    });

    assert.ok(recorded, "Event should be recorded in demo mode");
    assert.strictEqual(recorded.identifier, "student@college.edu");
    assert.ok(recorded.expiresAt > Date.now(), "Event has expiration timestamp");

    const events = getDemoEvents();
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].identifier, "student@college.edu");
  });

  it("Invariant 4: sendMagicLink returns demoLink only when demo mode is active", async () => {
    // 1. In standard non-demo mode:
    setEnv("NODE_ENV", "development");
    setEnv("DEMO_MODE", "false");

    const nonDemoResult = await sendMagicLink({
      identifier: "student@college.edu",
      type: "email",
      magicLink: "http://localhost:3000/verify?token=secret123",
    });

    assert.strictEqual(
      nonDemoResult.demoMode,
      undefined,
      "demoMode flag should not be returned when DEMO_MODE is false"
    );
    assert.strictEqual(
      nonDemoResult.demoLink,
      undefined,
      "demoLink must not be returned when DEMO_MODE is false"
    );

    // 2. In demo mode:
    setEnv("NODE_ENV", "development");
    setEnv("DEMO_MODE", "true");

    const demoResult = await sendMagicLink({
      identifier: "student@college.edu",
      type: "email",
      magicLink: "http://localhost:3000/verify?token=secret123",
    });

    assert.strictEqual(demoResult.demoMode, true);
    assert.strictEqual(demoResult.demoLink, "http://localhost:3000/verify?token=secret123");
  });

  it("Invariant 5: Production execution mandates real provider parameters and exposes zero demo links", async () => {
    setEnv("NODE_ENV", "production");
    setEnv("DEMO_MODE", "true"); // Attempting to trick demo mode in production

    const prodResult = await sendMagicLink({
      identifier: "student@college.edu",
      type: "email",
      magicLink: "http://localhost:3000/verify?token=secret123",
    });

    assert.strictEqual(
      prodResult.demoMode,
      undefined,
      "Production must never return demoMode flag"
    );
    assert.strictEqual(prodResult.demoLink, undefined, "Production must never leak demoLink");
  });

  it("does not report success when SMTP fails, including in demo mode", async () => {
    setEnv("NODE_ENV", "development");
    setMailTransporter({
      sendMail: async () => {
        throw new Error("SMTP unavailable");
      },
    } as unknown as Transporter);

    for (const demoMode of ["true", "false"]) {
      setEnv("DEMO_MODE", demoMode);
      await assert.rejects(
        () =>
          sendMagicLink({
            identifier: "student@college.edu",
            type: "email",
            magicLink: "http://localhost:3000/verify?token=test-only",
          }),
        { code: "EMAIL_DELIVERY_FAILED" }
      );
    }
  });
});
