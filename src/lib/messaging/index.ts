import { sendMagicLinkEmail, maskEmail, type SendEmailResult } from "./email";
import { AuthError } from "@/lib/auth/errors";
import { isDemoMode, recordDemoEvent, logDemoConsoleNotice } from "@/lib/demo";
import type { AuthChannel } from "@/types/auth";

export * from "./email";

export interface SendMagicLinkOptions {
  identifier: string;
  type: AuthChannel;
  magicLink: string;
}

export interface SendMagicLinkResult {
  success: boolean;
  channel: AuthChannel;
  recipientMasked: string;
  messageId?: string;
  demoMode?: boolean;
  demoLink?: string;
}

/**
 * Email magic link delivery.
 *
 * In Production:
 * - Real Email (Nodemailer SMTP) provider dispatch is mandatory.
 * - Credentials never exposed to client.
 * - Raw magic link never logged to disk or console.
 * - Recipient identifier is masked in logs.
 *
 * In Development (when DEMO_MODE=true):
 * - Records dispatch event in memory for local demo inspection.
 * - Formats high-visibility preview in server console.
 * - Returns demo preview strictly in non-production environments.
 */
export async function sendMagicLink({
  identifier,
  type,
  magicLink,
}: SendMagicLinkOptions): Promise<SendMagicLinkResult> {
  if (!identifier || !magicLink) {
    throw new AuthError(
      "Recipient identifier and magic link URL are required.",
      "INVALID_DISPATCH_PARAMS",
      400
    );
  }

  if (type !== "email") {
    throw new AuthError(`Unsupported delivery channel: ${type}`, "UNSUPPORTED_CHANNEL", 400);
  }

  // Development/Demo Mode event capture
  const demoActive = isDemoMode();
  if (demoActive) {
    const masked = maskEmail(identifier);
    recordDemoEvent({
      identifier,
      maskedIdentifier: masked,
      type,
      magicLink,
    });
    logDemoConsoleNotice({
      identifier,
      type,
      magicLink,
    });
  }

  // A preview must never turn a failed email delivery into a successful request.
  const result: SendEmailResult = await sendMagicLinkEmail(identifier, magicLink);
  return {
    success: result.success,
    channel: "email",
    recipientMasked: maskEmail(identifier),
    messageId: result.messageId,
    ...(demoActive ? { demoMode: true, demoLink: magicLink } : {}),
  };
}
