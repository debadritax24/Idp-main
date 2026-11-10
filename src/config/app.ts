/**
 * Centralized Application & Security Configuration
 */
export const APP_CONFIG = {
  name: "AuthZero-Pass",
  title: "Passwordless Authentication System",
  description:
    "Secure, cryptographic passwordless authentication using Email and Magic Links powered by Supabase PostgreSQL.",
  version: "1.0.0",
  academicContext: "College IDP (Independent Degree Project)",
  routes: {
    home: "/",
    login: "/login",
    verify: "/verify",
    dashboard: "/dashboard",
  },
  auth: {
    tokenExpiryMinutes: 10,
    sessionExpiryDays: 7,
    sessionCookieName: "auth_session",
    maxRequestsPerWindow: 5,
    rateLimitWindowMinutes: 15,
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
