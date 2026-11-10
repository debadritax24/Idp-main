import { NextRequest, NextResponse } from "next/server";
import {
  revokeSession,
  SESSION_COOKIE_NAME,
  getClearSessionCookieConfig,
} from "@/lib/auth/session";
import { verifyCsrfOrigin } from "@/lib/auth/security";

export async function POST(req: NextRequest) {
  // CSRF Defense: Validate Origin against Host header
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json(
      { success: false, error: "Cross-site request forgery detected." },
      { status: 403 }
    );
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (sessionCookie) {
    await revokeSession(sessionCookie).catch(() => {});
  }

  const clearConfig = getClearSessionCookieConfig();
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully.",
  });

  response.cookies.set({
    name: clearConfig.name,
    value: "",
    httpOnly: clearConfig.httpOnly,
    secure: clearConfig.secure,
    sameSite: clearConfig.sameSite,
    path: clearConfig.path,
    expires: clearConfig.expires,
    maxAge: 0,
  });

  return response;
}
