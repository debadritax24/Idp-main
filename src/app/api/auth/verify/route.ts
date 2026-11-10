import { NextRequest, NextResponse } from "next/server";
import { validateVerifyToken } from "@/lib/auth/validation";
import { consumeAuthToken } from "@/lib/auth/token";
import { createSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/queries/users";
import { checkRateLimit, recordAttempt } from "@/lib/db/queries/attempts";
import { hashClientIp, verifyCsrfOrigin } from "@/lib/auth/security";
import {
  InvalidTokenError,
  TokenExpiredError,
  TokenAlreadyUsedError,
  AuthError,
} from "@/lib/auth/errors";

export async function POST(req: NextRequest) {
  // 1. CSRF Defense: Validate Origin against Host header
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json(
      {
        success: false,
        state: "invalid",
        error: "Cross-site request forgery detected.",
      },
      { status: 403 }
    );
  }

  // 2. Client IP extraction & Rate Limiting for verification floods
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const clientIp = (forwardedFor ? forwardedFor.split(",")[0] : realIp) || "127.0.0.1";
  const ipHash = hashClientIp(clientIp);

  try {
    const rateLimit = await checkRateLimit({
      ipHash,
      maxAttemptsPerIp: 30,
      windowMinutes: 15,
    });

    if (rateLimit.isLimited) {
      return NextResponse.json(
        {
          success: false,
          state: "invalid",
          error: "Too many verification attempts. Please wait before trying again.",
        },
        { status: 429 }
      );
    }
  } catch (dbErr) {
    console.error(
      "[Rate Limit Error] Verification rate limit check failed:",
      dbErr instanceof Error ? dbErr.message : dbErr
    );
    return NextResponse.json(
      {
        success: false,
        state: "server_error",
        error: "Service temporarily unavailable. Please try again shortly.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { token } = validateVerifyToken(body);

    // 3. Atomically claim the single-use token (UPDATE ... WHERE used_at IS NULL AND expires_at > NOW())
    const claimedToken = await consumeAuthToken(token);

    // 4. Resolve the bound user identity
    if (!claimedToken.userId) {
      throw new InvalidTokenError("Authentication token is not linked to a registered identity.");
    }

    const user = await findUserById(claimedToken.userId);
    if (!user) {
      throw new InvalidTokenError("User identity associated with this token was not found.");
    }

    // 5. Establish server-side authenticated session
    const { rawSessionToken, cookieOptions } = await createSession(user.id);

    // Record successful verification attempt
    await recordAttempt({
      email: user.email,
      phone: user.phone,
      ipHash,
      success: true,
    }).catch(() => {});

    // Build JSON response
    const response = NextResponse.json({
      success: true,
      state: "success",
      redirectUrl: "/dashboard",
    });

    // 6. Set hardened HTTP-only session cookie
    response.cookies.set({
      name: cookieOptions.name,
      value: rawSessionToken,
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      expires: cookieOptions.expires,
      maxAge: cookieOptions.maxAge,
    });

    return response;
  } catch (err: unknown) {
    // Record failed verification attempt
    await recordAttempt({
      ipHash,
      success: false,
    }).catch(() => {});

    if (err instanceof TokenAlreadyUsedError) {
      return NextResponse.json(
        {
          success: false,
          state: "already_used",
          error: "This magic link has already been used.",
        },
        { status: 400 }
      );
    }

    if (err instanceof TokenExpiredError) {
      return NextResponse.json(
        {
          success: false,
          state: "expired",
          error: "This magic link has expired.",
        },
        { status: 400 }
      );
    }

    if (err instanceof InvalidTokenError) {
      return NextResponse.json(
        {
          success: false,
          state: "invalid",
          error: "This magic link is invalid or malformed.",
        },
        { status: 400 }
      );
    }

    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, state: "invalid", error: err.message },
        { status: err.statusCode }
      );
    }

    console.error("[Verify Route Error]:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      {
        success: false,
        state: "server_error",
        error: "A server error occurred during verification.",
      },
      { status: 500 }
    );
  }
}
