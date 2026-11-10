import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import {
  getCurrentSession,
  SESSION_COOKIE_NAME,
  getClearSessionCookieConfig,
} from "@/lib/auth/session";
import { DashboardView } from "@/components/dashboard/dashboard-view";

/**
 * Server-Side Protected Dashboard Page.
 *
 * Execution Order:
 * 1. Reads the HTTP-only auth_session cookie directly from incoming headers.
 * 2. If cookie is missing -> server redirects to /login.
 * 3. Queries PostgreSQL database and verifies SHA-256 session token hash.
 * 4. Checks session expiration horizon (expires_at > NOW()) and revocation status.
 * 5. If invalid, expired, or revoked -> server redirects to /login.
 * 6. If valid -> server streams authenticated dashboard view with zero token leakage.
 */
export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    redirect("/login");
  }

  let sessionContext;
  try {
    sessionContext = await getCurrentSession(sessionCookie);
  } catch {
    // Clear the stale/invalid session cookie before redirecting
    const clearConfig = getClearSessionCookieConfig();
    cookieStore.set(clearConfig.name, "", {
      httpOnly: clearConfig.httpOnly,
      secure: clearConfig.secure,
      sameSite: clearConfig.sameSite,
      path: clearConfig.path,
      expires: clearConfig.expires,
      maxAge: 0,
    });
    redirect("/login");
  }

  const { user, session } = sessionContext;

  const initialUser = {
    id: user.id,
    email: user.email,
    phone: user.phone,
    createdAt: user.createdAt.toISOString(),
  };

  const initialSession = {
    id: session.id,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-start px-4 py-10 sm:px-6">
      <div className="w-full max-w-4xl space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Overview
        </Link>

        <DashboardView initialUser={initialUser} initialSession={initialSession} />

        <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400 dark:text-slate-500 pt-4">
          <Shield className="h-3.5 w-3.5 text-emerald-600" />
          <span>Server-Side Verified Boundary &bull; Protected by HTTP-Only Cookie</span>
        </div>
      </div>
    </div>
  );
}
