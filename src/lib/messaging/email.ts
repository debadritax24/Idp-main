import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { AuthError } from "@/lib/auth/errors";

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/**
 * Mask an email address for safe logging (e.g. st***t@college.edu).
 */
export function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "inv***@***";
  const [local, domain] = parts;
  const maskedLocal =
    local.length <= 2 ? `${local[0]}***` : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Validates and retrieves the server-side SMTP configuration from environment variables.
 * Throws a clear configuration error if any required variable is missing or invalid.
 */
export function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST?.trim();
  const portStr = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim().replace(/^["']|["']$/g, "");
  const pass = process.env.SMTP_PASSWORD?.trim().replace(/^["']|["']$/g, "");
  const from = process.env.SMTP_FROM?.trim().replace(/^["']|["']$/g, "");
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !portStr || !user || !pass || !from) {
    const missing: string[] = [];
    if (!host) missing.push("SMTP_HOST");
    if (!portStr) missing.push("SMTP_PORT");
    if (!user) missing.push("SMTP_USER");
    if (!pass) missing.push("SMTP_PASSWORD");
    if (!from) missing.push("SMTP_FROM");

    throw new AuthError(
      `SMTP configuration error: Missing required environment variables (${missing.join(", ")}). Please configure your SMTP settings in .env.`,
      "SMTP_CONFIG_ERROR",
      500
    );
  }

  const port = Number(portStr);
  if (isNaN(port) || port <= 0) {
    throw new AuthError(
      "SMTP configuration error: SMTP_PORT must be a valid positive integer.",
      "SMTP_CONFIG_ERROR",
      500
    );
  }

  return { host, port, secure, user, pass, from };
}

let cachedTransporter: Transporter | null = null;

/**
 * Creates or returns a reusable Nodemailer mail transporter.
 */
export function getMailTransporter(): Transporter {
  if (!cachedTransporter) {
    const config = getSmtpConfig();
    const isGmail = config.host.toLowerCase().includes("gmail.com");

    cachedTransporter = nodemailer.createTransport(
      isGmail
        ? {
            service: "gmail",
            auth: {
              user: config.user,
              pass: config.pass.replace(/\s+/g, ""),
            },
          }
        : {
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
              user: config.user,
              pass: config.pass,
            },
            connectionTimeout: 15_000,
            greetingTimeout: 10_000,
            socketTimeout: 30_000,
          }
    );
  }
  return cachedTransporter;
}

/**
 * Allows setting a custom or mock mail transporter (useful for testing).
 */
export function setMailTransporter(transporter: Transporter | null): void {
  cachedTransporter = transporter;
}

/**
 * Resets the cached transporter (useful for testing or dynamic configuration updates).
 */
export function resetMailTransporter(): void {
  cachedTransporter = null;
}

/**
 * Generates responsive HTML content for the magic-link authentication email.
 */
export function renderMagicLinkEmailHtml(magicLink: string, expiryMinutes = 10): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your College IDP Login Link</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; color: #09090b; margin: 0; padding: 24px; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05); }
    .header { padding: 28px 24px 20px; text-align: left; border-bottom: 1px solid #f4f4f5; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.02em; color: #09090b; }
    .content { padding: 28px 24px; line-height: 1.6; font-size: 14px; color: #3f3f46; }
    .content p { margin: 0 0 16px 0; }
    .btn-wrapper { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #09090b; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; }
    .notice { font-size: 12px; color: #71717a; margin-top: 20px; }
    .footer { border-top: 1px solid #f4f4f5; padding: 20px 24px; text-align: left; font-size: 12px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>College IDP Authentication System</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>You requested to sign in to College IDP.</p>
      <p>Click the button below to securely continue:</p>
      <div class="btn-wrapper">
        <a href="${magicLink}" class="btn" target="_blank" rel="noopener noreferrer">Login Securely</a>
      </div>
      <p class="notice">This login link expires in ${expiryMinutes} minutes and can only be used once.</p>
      <p class="notice">If you did not request this login, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      College IDP Authentication System
    </div>
  </div>
</body>
</html>`;
}

/**
 * Plain-text version of the magic-link authentication email.
 */
export function renderMagicLinkEmailText(magicLink: string, expiryMinutes = 10): string {
  return `Hello,

You requested to sign in to College IDP.

Click the button below to securely continue:

${magicLink}

This login link expires in ${expiryMinutes} minutes and can only be used once.

If you did not request this login, you can safely ignore this email.

College IDP Authentication System`;
}

/**
 * Dispatches a passwordless magic link to the recipient email via Nodemailer SMTP.
 *
 * Guarantees:
 * 1. Strictly uses Nodemailer with SMTP.
 * 2. All SMTP credentials are read server-side from .env.
 * 3. Never logs SMTP passwords or magic link tokens.
 * 4. Throws a clear configuration error if SMTP credentials are missing.
 * 5. Returns a clean success result.
 */
export async function sendMagicLinkEmail(
  email: string,
  magicLink: string
): Promise<SendEmailResult> {
  if (!email || !magicLink) {
    throw new AuthError(
      "Recipient email and magic link are required.",
      "INVALID_DISPATCH_PARAMS",
      400
    );
  }

  const masked = maskEmail(email);

  try {
    const transporter = getMailTransporter();
    const fromAddress = (
      process.env.SMTP_FROM?.trim() || "College IDP Auth <auth@college.edu>"
    ).replace(/^["']|["']$/g, "");
    const info = await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: "Your College IDP Login Link",
      html: renderMagicLinkEmailHtml(magicLink),
      text: renderMagicLinkEmailText(magicLink),
    });

    if (!Array.isArray(info.accepted) || info.accepted.length === 0) {
      throw new AuthError(
        "The mail server did not accept the recipient. Please check your email address and try again.",
        "EMAIL_DELIVERY_FAILED",
        502
      );
    }

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    if (err instanceof AuthError) throw err;
    // Provider messages can contain credentials or recipient details; log codes only.
    const smtpError = err as { code?: string; responseCode?: number } | null;
    console.error(`[SMTP Delivery Error] Failed to send email to ${masked}`, {
      code: smtpError?.code,
      responseCode: smtpError?.responseCode,
    });
    throw new AuthError(
      "Failed to deliver magic link email via SMTP. Please verify mail configuration or try again.",
      "EMAIL_DELIVERY_FAILED",
      502
    );
  }
}
