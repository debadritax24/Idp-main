import { NextResponse } from "next/server";
import { isDemoMode, getDemoEvents, clearDemoEvents } from "@/lib/demo";

/**
 * Protected Development-Only Endpoint for Demo Events.
 *
 * Guaranteed:
 * - Strictly disabled and returns 404 in production or when DEMO_MODE !== 'true'.
 * - Used during academic project demos to inspect dispatch events without accessing email.
 */
export async function GET() {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    demoMode: true,
    events: getDemoEvents(),
  });
}

export async function DELETE() {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  clearDemoEvents();
  return NextResponse.json({ success: true, message: "Demo events cleared." });
}
