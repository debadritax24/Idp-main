"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  RotateCw,
  Shield,
  KeyRound,
  ExternalLink,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedTarget, setSubmittedTarget] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [demoLink, setDemoLink] = useState<string | null>(null);

  // Resend cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError("Please provide an email address.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: trimmed,
          type: "email",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(
          data.error || "Failed to dispatch magic link. Please verify your details and try again."
        );
        setIsLoading(false);
        return;
      }

      setSubmittedTarget(trimmed);
      setIsSuccess(true);
      setCooldown(60);
      if (data.demoLink) {
        setDemoLink(data.demoLink);
      }
    } catch {
      setError("A network error occurred. Please verify your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !submittedTarget || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: submittedTarget,
          type: "email",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to resend magic link.");
      } else {
        setCooldown(60);
        if (data.demoLink) {
          setDemoLink(data.demoLink);
        }
      }
    } catch {
      setError("Failed to resend magic link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIsSuccess(false);
    setIdentifier("");
    setError(null);
    setDemoLink(null);
  };

  return (
    <Card className="w-full max-w-md border-slate-200/90 shadow-md shadow-slate-200/50 dark:border-slate-800 dark:shadow-none bg-white dark:bg-slate-900">
      <CardHeader className="text-center pb-2 pt-6">
        <div className="flex justify-center mb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700">
            <KeyRound className="h-5 w-5" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Sign In to College IDP
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Passwordless authentication via single-use cryptographic magic links.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-3">
        {error && (
          <Alert variant="destructive" title="Request Failed">
            {error}
          </Alert>
        )}

        {isSuccess ? (
          /* SUCCESS STATE */
          <div className="space-y-5 text-center py-2 animate-in fade-in duration-200">
            <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Check your email
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                A temporary authentication link has been dispatched to:
              </p>
              <div className="inline-block rounded-md bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                {submittedTarget}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-1">
                💡 Don&apos;t see it? Please check your <strong>Spam</strong> or{" "}
                <strong>Junk</strong> folder.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-850/60 dark:text-slate-400 text-left space-y-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider">
                Authentication Steps:
              </span>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    1
                  </span>
                  <span>Open the link delivered via email.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    2
                  </span>
                  <span>Click &quot;Confirm and Sign In&quot; on the anti-crawler screen.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    3
                  </span>
                  <span>Your secure HTTP-only session is established.</span>
                </li>
              </ul>
            </div>

            {demoLink && (
              <div className="rounded-lg border border-slate-200/90 bg-slate-50/80 p-3.5 text-left space-y-2 dark:border-slate-800 dark:bg-slate-800/60 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                    Demo Mode Preview (Development Only)
                  </span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                    DEMO_MODE=true
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Development preview: you can also open the generated link below to test token
                  verification and session creation.
                </p>
                <div className="pt-0.5">
                  <a
                    href={demoLink}
                    className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors shadow-2xs"
                  >
                    <span>Open Generated Magic Link</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Badge variant="outline" className="text-[10px] py-0.5">
                Single-Use Token
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0.5">
                Expires in 10m
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0.5">
                SHA-256 Hashed
              </Badge>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                disabled={cooldown > 0 || isLoading}
                className="w-full text-xs gap-2"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                {cooldown > 0 ? `Resend magic link in ${cooldown}s` : "Resend magic link"}
              </Button>

              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors py-1"
              >
                &larr; Use a different email address
              </button>
            </div>
          </div>
        ) : (
          /* FORM STATE */
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email address"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              helperText="We'll send a temporary, one-click sign-in link to this address."
              required
              autoComplete="email"
              disabled={isLoading}
              autoFocus
            />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full text-sm font-semibold h-10 mt-1"
              isLoading={isLoading}
            >
              {isLoading ? (
                <span>Sending Magic Link...</span>
              ) : (
                <>
                  <span>Send Magic Link</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-center justify-center border-t border-slate-100 dark:border-slate-800/80 pt-3 pb-4">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <Shield className="h-3 w-3 text-emerald-600 dark:text-emerald-500" />
          <span>Single-use token &bull; 10m TTL &bull; Zero plaintext at rest</span>
        </div>
      </CardFooter>
    </Card>
  );
}
