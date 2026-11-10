"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, ShieldCheck, LayoutDashboard, LogIn, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Overview", icon: Sparkles },
    { href: "/login", label: "Sign In", icon: LogIn },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-15 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <KeyRound className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              AuthZero-Pass
            </span>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex text-[10px] py-0 px-1.5 font-normal"
            >
              College IDP
            </Badge>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-850 dark:text-slate-100 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 rounded-md px-2.5 py-1 bg-slate-50 dark:bg-slate-900">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
            <span>Zero Passwords at Rest</span>
          </div>
        </div>
      </div>
    </header>
  );
}
