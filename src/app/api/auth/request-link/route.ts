import { NextRequest, NextResponse } from "next/server";
import { validateMagicLinkRequest } from "@/lib/auth/validation";
import { createAuthToken } from "@/lib/auth/token";
import { invalidatePriorTokens } from "@/lib/db/queries/tokens";
import { getOrCreateUserByIdentifier } from "@/lib/auth/user";
import { checkRateLimit, recordAttempt } from "@/lib/db/queries/attempts";
import { sendMagicLink } from "@/lib/messaging";
import { AuthError } from "@/lib/auth/errors";
import { hashClientIp, verifyCsrfOrigin } from "@/lib/auth/security";

export async function POST(req: NextRequest) {
  // 1. CSRF Defense: Validate Origin against Host header
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json(
      { success: false, error: "Cross-site request forgery detected." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { normalizedIdentifier, type } = validateMagicLinkRequest(body);

    // Extract client IP address safely and hash it for privacy-preserving rate limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = (forwardedFor ? forwardedFor.split(",")[0] : realIp) || "127.0.0.1";
    const ipHash = hashClientIp(clientIp);

    // Check sliding window rate limit (5 attempts / 15m per identifier, 15 attempts / 15m per IP)
    const emailParam = normalizedIdentifier;

    try {
      const rateLimit = await checkRateLimit({
        email: emailParam,
        phone: null,
        ipHash,
        maxAttemptsPerIdentifier: 5,
        maxAttemptsPerIp: 15,
        windowMinutes: 15,
      });

      if (rateLimit.isLimited) {
        await recordAttempt({
          email: emailParam,
          phone: null,
          ipHash,
          success: false,
        }).catch(() => {});

        return NextResponse.json(
          {
            success: false,
            error:
              "Too many authentication requests. Please wait a few minutes before trying again.",
          },
          { status: 429 }
        );
      }
    } catch (dbErr) {
      console.error(
        "[Rate Limit Error] Database rate limit check failed:",
        dbErr instanceof Error ? dbErr.message : dbErr
      );
      return NextResponse.json(
        {
          success: false,
          error: "Service temporarily unavailable. Please try again shortly.",
        },
        { status: 503 }
      );
    }

    // 2. Identity Binding: Resolve or provision user identity
    const user = await getOrCreateUserByIdentifier(normalizedIdentifier, type);

    // 3. Cryptographic Token Generation: Generate 256-bit token & hash bound to user_id
    // Invalidate any prior unconsumed tokens for this user
    await invalidatePriorTokens(user.id).catch(() => {});

    const { rawToken } = await createAuthToken({
      userId: user.id,
      expiresInMinutes: 10,
    });

    // 4. Construct verification magic link (strictly from trusted config, never from request headers)
    const origin = process.env.NEXT_PUBLIC_APP_URL;
    if (!origin) {
      console.error("[Config Error] NEXT_PUBLIC_APP_URL is not set. Cannot generate magic link.");
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error. Please contact the administrator.",
        },
        { status: 500 }
      );
    }
    const magicLink = `${origin.replace(/\/+$/, "")}/verify?token=${rawToken}`;

    // 5. Dispatch magic link via delivery provider (Nodemailer SMTP)
    const dispatchResult = await sendMagicLink({
      identifier: normalizedIdentifier,
      type,
      magicLink,
    });

    // Record successful dispatch attempt
    await recordAttempt({
      email: emailParam,
      phone: null,
      ipHash,
      success: true,
    }).catch(() => {});

    // Uniform response prevents user enumeration
    // In development with DEMO_MODE=true, safely returns demoLink for local preview
    return NextResponse.json({
      success: true,
      message: "If the provided details are valid, a temporary magic link has been dispatched.",
      ...(dispatchResult.demoMode ? { demoMode: true, demoLink: dispatchResult.demoLink } : {}),
    });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    }

    const message = err instanceof Error ? err.message : "Failed to process request";
    console.error("[Request Link Error]:", message);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to process authentication request at this time. Please try again.",
      },
      { status: 500 }
    );
  }
}
