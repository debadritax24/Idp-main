import React, { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { VerifyView } from "@/components/auth/verify-view";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function VerifyPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Overview</span>
          </Link>

          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            College IDP Project
          </span>
        </div>

        <Suspense
          fallback={
            <Card className="w-full max-w-md border-slate-200/90 shadow-md shadow-slate-200/50 dark:border-slate-800 text-center py-12 bg-white dark:bg-slate-900">
              <CardHeader>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Initializing Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 dark:text-slate-400">
                Reading authentication token from URL...
              </CardContent>
            </Card>
          }
        >
          <VerifyView />
        </Suspense>

        <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400 dark:text-slate-500 pt-1">
          <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
          <span>Atomic single-use token verification &bull; Anti-crawler protection</span>
        </div>
      </div>
    </div>
  );
}
