import { Shield, Database, Lock, Server } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200/80 bg-slate-50 py-10 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-200/70 dark:border-slate-800/70 text-left">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
              Academic Project Scope
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              An Independent Degree Project demonstrating passwordless authentication via single-use
              magic links, SHA-256 token hashing, and HTTP-only session cookies.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
              System Architecture
            </h4>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <li>&bull; Supabase PostgreSQL with pooled connection</li>
              <li>&bull; Nodemailer SMTP transactional email</li>
              <li>&bull; Zero Supabase Auth or third-party auth SDKs</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
              Security Specifications
            </h4>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <li>&bull; 256-bit cryptographically secure tokens</li>
              <li>&bull; SHA-256 hash storage at rest</li>
              <li>&bull; Atomic single-use consumption in PostgreSQL</li>
              <li>&bull; Sliding-window rate limiting</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-slate-400" />
            <span>Next.js App Router &bull; TypeScript &bull; Tailwind CSS</span>
          </div>
          <div>
            <span>College IDP Project Evaluation Build</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
