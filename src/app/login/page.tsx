import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
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

        <LoginForm />

        <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400 dark:text-slate-500 pt-1">
          <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
          <span>Server-side PostgreSQL engine &bull; Zero third-party auth SDKs</span>
        </div>
      </div>
    </div>
  );
}
