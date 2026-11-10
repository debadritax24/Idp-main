import crypto from "crypto";
import { NextRequest } from "next/server";

/**
 * Computes a privacy-preserving SHA-256 hash of a client IP address with a secret salt.
 * Ensures IP addresses are never stored in plaintext for GDPR and privacy compliance.
 */
export function hashClientIp(ip: string): string {
  const salt = process.env.MAGIC_LINK_SECRET || "secure_ip_salt_fallback_at_least_32";
  return crypto.createHash("sha256").update(`${salt}:${ip.trim()}`).digest("hex");
}

/**
 * Validates request Origin and Host headers on mutation endpoints (POST/PUT/DELETE)
 * to provide defense-in-depth against Cross-Site Request Forgery (CSRF).
 */
export function verifyCsrfOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  // Non-browser or server-to-server requests without Origin are permissible
  if (!origin || !host) {
    return true;
  }

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
