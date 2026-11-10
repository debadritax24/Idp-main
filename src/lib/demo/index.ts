/**
 * Demo Mode Security and Configuration Controller.
 *
 * CRITICAL ARCHITECTURAL SAFEGUARDS:
 * 1. Demo mode is IMPOSSIBLE to activate in production. If process.env.NODE_ENV === "production",
 *    isDemoMode() unconditionally evaluates to false regardless of DEMO_MODE environment values.
 * 2. Token generation, SHA-256 hashing at rest, expiration, and atomic single-use checks
 *    are NEVER bypassed in demo mode. The full cryptographic verification pipeline always executes.
 * 3. In production, raw magic links are never returned in API payloads or printed to stdout.
 */

export interface DemoDispatchEvent {
  id: string;
  identifier: string;
  maskedIdentifier: string;
  type: "email";
  magicLink: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory ring buffer for demo dispatch events (development only)
const demoEvents: DemoDispatchEvent[] = [];
const MAX_DEMO_EVENTS = 20;

/**
 * Returns whether Demo Mode is enabled.
 * Strictly guarantees that demo mode CANNOT run in production.
 */
export function isDemoMode(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.DEMO_MODE === "true";
}

/**
 * Safely captures a generated magic link event in memory for local evaluation.
 * No-op if demo mode is inactive or running in production.
 */
export function recordDemoEvent(
  event: Omit<DemoDispatchEvent, "id" | "createdAt" | "expiresAt">
): DemoDispatchEvent | null {
  if (!isDemoMode()) return null;

  const now = Date.now();
  const demoEvent: DemoDispatchEvent = {
    ...event,
    id: `demo_${now}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000, // 10 minutes TTL
  };

  // Prepend and trim to maximum capacity
  demoEvents.unshift(demoEvent);
  if (demoEvents.length > MAX_DEMO_EVENTS) {
    demoEvents.pop();
  }

  // Purge expired events
  purgeExpiredDemoEvents();

  return demoEvent;
}

/**
 * Returns unexpired demo dispatch events (development only).
 */
export function getDemoEvents(): DemoDispatchEvent[] {
  if (!isDemoMode()) return [];
  purgeExpiredDemoEvents();
  return [...demoEvents];
}

/**
 * Clears demo events (for testing or reset).
 */
export function clearDemoEvents(): void {
  demoEvents.length = 0;
}

function purgeExpiredDemoEvents(): void {
  const now = Date.now();
  const valid = demoEvents.filter((e) => e.expiresAt > now);
  demoEvents.length = 0;
  demoEvents.push(...valid);
}

/**
 * Formats a prominent development console notification for evaluators.
 */
export function logDemoConsoleNotice(event: {
  identifier: string;
  type: "email";
  magicLink: string;
}): void {
  if (!isDemoMode()) return;

  const separator = "=".repeat(76);
  console.log("\n" + separator);
  console.log(" [DEMO MODE ACTIVE: MAGIC LINK DISPATCHED]");
  console.log(" Channel:    " + event.type.toUpperCase());
  console.log(" Recipient:  " + event.identifier);
  console.log(" Expiration: 10 minutes (Atomic single-use token active in PostgreSQL)");
  console.log(" Magic Link URL:");
  console.log(" --> " + event.magicLink);
  console.log(" Click or copy the URL above to proceed through the verification cycle.");
  console.log(separator + "\n");
}
