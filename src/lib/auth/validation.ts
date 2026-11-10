import { z } from "zod";
import { ValidationError } from "./errors";
import type { AuthChannel } from "@/types/auth";

/**
 * Standard RFC 5322-compliant email schema.
 * Normalizes input by trimming whitespace and lowercasing.
 */
export const emailSchema = z
  .string({ message: "Email address is required." })
  .trim()
  .toLowerCase()
  .min(3, "Email address is too short.")
  .max(255, "Email address must not exceed 255 characters.")
  .email("Invalid email address format.");

/** Validates email-only magic link requests. */
export const magicLinkRequestSchema = z.object({
  identifier: emailSchema,
  type: z.literal("email", { message: "Channel type must be 'email'." }),
});

/**
 * Verify token input schema.
 * Enforces token minimum length (hex tokens are 64 characters).
 */
export const verifyTokenSchema = z.object({
  token: z
    .string({ message: "Authentication token is required." })
    .trim()
    .min(32, "Authentication token is malformed.")
    .max(128, "Authentication token is too long.")
    .regex(/^[a-fA-F0-9_-]+$/, "Authentication token contains invalid characters."),
});

/**
 * Sanitizes and validates magic link request inputs.
 */
export function validateMagicLinkRequest(input: unknown): {
  normalizedIdentifier: string;
  type: AuthChannel;
} {
  const result = magicLinkRequestSchema.safeParse(input);
  if (!result.success) {
    const firstError = result.error.issues[0]?.message || "Validation failed.";
    throw new ValidationError(firstError);
  }

  const { identifier, type } = result.data;
  const normalizedIdentifier = identifier;

  return { normalizedIdentifier, type };
}

/**
 * Sanitizes and validates token verification inputs.
 */
export function validateVerifyToken(input: unknown): { token: string } {
  const result = verifyTokenSchema.safeParse(input);
  if (!result.success) {
    const firstError = result.error.issues[0]?.message || "Invalid authentication token format.";
    throw new ValidationError(firstError);
  }
  return { token: result.data.token };
}
