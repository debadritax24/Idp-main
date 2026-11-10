import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentSession,
  SESSION_COOKIE_NAME,
  getClearSessionCookieConfig,
} from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.json(
      { success: false, authenticated: false, error: "Unauthenticated" },
      { status: 401 }
    );
  }

  try {
    const { session, user } = await getCurrentSession(sessionCookie);

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
    });
  } catch (err: unknown) {
    // Session is invalid, expired, or revoked - clear cookie
    const clearConfig = getClearSessionCookieConfig();
    const response = NextResponse.json(
      {
        success: false,
        authenticated: false,
        error: "Session invalid or expired",
      },
      { status: 401 }
    );

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
}
