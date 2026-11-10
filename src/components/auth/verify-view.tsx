"use client";

import React, { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  KeyRound,
  ArrowRight,
  ShieldAlert,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type VerifyState =
  | "awaiting_confirmation"
  | "verifying"
  | "success"
  | "invalid"
  | "expired"
  | "already_used"
  | "server_error";

export function VerifyView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<VerifyState>(token ? "awaiting_confirmation" : "invalid");
  const [errorMessage, setErrorMessage] = useState<string>(
    token ? "" : "No authentication token was found in the magic link URL."
  );
  const hasTriggeredRef = useRef(false);

  const executeVerification = async () => {
    if (!token) {
      setState("invalid");
      setErrorMessage("No authentication token was found in the magic link URL.");
      return;
    }

    // Prevent double execution
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    setState("verifying");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setState("success");
        // Smooth redirect after visual confirmation
        setTimeout(() => {
          router.push(data.redirectUrl || "/dashboard");
        }, 1200);
        return;
      }

      const serverState = data.state as VerifyState;
      if (["invalid", "expired", "already_used", "server_error"].includes(serverState)) {
        setState(serverState);
      } else {
        setState("invalid");
      }

      setErrorMessage(data.error || "Verification failed. The token could not be verified.");
    } catch {
      setState("server_error");
      setErrorMessage(
        "Network error occurred during token verification. Please check your connection."
      );
    }
  };

  return (
    <Card className="w-full max-w-md border-slate-200/90 shadow-md shadow-slate-200/50 dark:border-slate-800 dark:shadow-none bg-white dark:bg-slate-900">
      {/* 0. AWAITING USER CONFIRMATION STATE */}
      {state === "awaiting_confirmation" && (
        <>
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="flex justify-center mb-1">
              <Badge variant="outline" className="text-[10px] py-0.5">
                Anti-Crawler Protection Active
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Confirm Sign In
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Click the button below to complete your authentication and establish a secure session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-850/60 dark:text-slate-400 leading-relaxed">
              This manual confirmation step prevents automated email security scanners from
              consuming your single-use magic link before you can use it.
            </div>
            <Button
              variant="primary"
              className="w-full text-sm font-semibold h-10 gap-1.5"
              onClick={executeVerification}
            >
              <span>Confirm and Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </>
      )}

      {/* 1. VERIFYING STATE */}
      {state === "verifying" && (
        <>
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
              <Loader2 className="h-6 w-6 animate-spin text-slate-800 dark:text-slate-200" />
            </div>
            <div className="flex justify-center mb-1">
              <Badge variant="outline" className="text-[10px] py-0.5">
                Cryptographic Token Verification
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Verifying Magic Link
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Validating token hash, expiration horizon, and single-use status...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-6 space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please wait while we establish your authenticated session.
            </p>
          </CardContent>
        </>
      )}

      {/* 2. AUTHENTICATION SUCCESSFUL STATE */}
      {state === "success" && (
        <>
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="flex justify-center mb-1">
              <Badge variant="success" className="text-[10px] py-0.5">
                Token Claimed Successfully
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Authentication Successful
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your token has been consumed and an HTTP-only session created.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-4 space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Redirecting to your dashboard...</span>
            </div>
            <Link href="/dashboard" className="block pt-1">
              <Button size="md" variant="primary" className="w-full text-xs">
                <span>Continue to Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </>
      )}

      {/* 3. INVALID LINK STATE */}
      {state === "invalid" && (
        <>
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-200/60 dark:border-red-800/60">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="flex justify-center mb-1">
              <Badge variant="destructive" className="text-[10px] py-0.5">
                Token Unrecognized
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Invalid Magic Link
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {errorMessage || "The authentication token in this link is invalid or malformed."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="rounded-lg border border-red-200/80 bg-red-50/50 p-3.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 leading-relaxed">
              Magic links are uniquely signed with 256 bits of entropy and cannot be guessed or
              forged. Please return to sign in and request a fresh link.
            </div>
            <Link href="/login" className="block">
              <Button variant="primary" className="w-full text-xs gap-1.5 h-10">
                <span>Return to Sign In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </>
      )}

      {/* 4. EXPIRED LINK STATE */}
      {state === "expired" && (
        <>
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
              <Clock className="h-6 w-6" />
            </div>
            <div className="flex justify-center mb-1">
              <Badge variant="warning" className="text-[10px] py-0.5">
                TTL Expired (10 Minutes)
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Magic Link Expired
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {errorMessage ||
                "For security reasons, magic links expire 10 minutes after generation."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 leading-relaxed">
              This token has exceeded its 10-minute lifetime. Expired tokens are automatically
              invalidated in PostgreSQL to prevent delayed hijacking.
            </div>
            <Link href="/login" className="block">
              <Button variant="primary" className="w-full text-xs gap-1.5 h-10">
                <span>Request a Fresh Magic Link</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </>
      )}

      {/* 5. ALREADY USED LINK STATE */}
      {state === "already_used" && (
        <>
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <KeyRound className="h-6 w-6" />
            </div>
            <div className="flex justify-center mb-1">
              <Badge variant="outline" className="text-[10px] py-0.5">
                Anti-Replay Invariant Triggered
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Link Already Consumed
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {errorMessage || "This magic link has already been used to create an active session."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-850/60 dark:text-slate-400 leading-relaxed">
              To defend against token replay attacks and multi-device interception, magic links are
              strictly single-use. If you need to sign in on another browser or device, request a
              new link.
            </div>
            <Link href="/login" className="block">
              <Button variant="primary" className="w-full text-xs gap-1.5 h-10">
                <span>Request a New Magic Link</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </>
      )}

      {/* 6. SERVER ERROR STATE */}
      {state === "server_error" && (
        <>
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-200/60 dark:border-red-800/60">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="flex justify-center mb-1">
              <Badge variant="destructive" className="text-[10px] py-0.5">
                Service Error
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Verification Unavailable
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {errorMessage || "A server or network error occurred during verification."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400 leading-relaxed">
              We were unable to complete the verification request. Please check your network and try
              again.
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full text-xs gap-1.5 h-10"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Retry Verification</span>
              </Button>
              <Link href="/login" className="block">
                <Button variant="ghost" className="w-full text-xs h-9">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </>
      )}

      <CardFooter className="flex flex-col items-center justify-center border-t border-slate-100 dark:border-slate-800/80 pt-3 pb-4">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
          Single-use token &bull; SHA-256 hash verified &bull; HTTP-only session
        </p>
      </CardFooter>
    </Card>
  );
}
