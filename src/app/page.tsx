import Link from "next/link";
import {
  ShieldCheck,
  Mail,
  Database,
  Lock,
  ArrowRight,
  Fingerprint,
  RefreshCw,
  Cookie,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function HomePage() {
  const securityFeatures = [
    {
      icon: Lock,
      title: "Cryptographic Randomness",
      description:
        "Tokens generated with 32 bytes of cryptographically secure random entropy (256 bits) via Node.js crypto CSPRNG.",
    },
    {
      icon: Fingerprint,
      title: "SHA-256 Hashed at Rest",
      description:
        "Raw magic-link tokens and session secrets are never stored. Only one-way SHA-256 digests exist in PostgreSQL.",
    },
    {
      icon: RefreshCw,
      title: "Atomic Single-Use",
      description:
        "Tokens expire within 10 minutes and are consumed via conditional SQL update operations preventing race conditions and replay attacks.",
    },
    {
      icon: Cookie,
      title: "Hardened HTTP-Only Cookies",
      description:
        "Sessions use HttpOnly, SameSite=Lax, and Secure cookie flags, completely insulating credentials from browser JavaScript and XSS.",
    },
    {
      icon: Database,
      title: "Pure Supabase PostgreSQL",
      description:
        "Supabase is used strictly as a relational PostgreSQL engine via server-side connection pooling. Zero Supabase Auth SDK.",
    },
    {
      icon: Layers,
      title: "Sliding Rate Limiter",
      description:
        "PostgreSQL-backed sliding window rate limiting restricts link generation and brute-force token verification attempts.",
    },
  ];

  const authFlowSteps = [
    {
      step: "01",
      title: "Enter Identifier",
      desc: "User inputs an email address.",
    },
    {
      step: "02",
      title: "Token Generation & Hash",
      desc: "Server generates a 256-bit random token, hashes it with SHA-256, and saves the hash with a 10-minute expiry.",
    },
    {
      step: "03",
      title: "Dispatch via Provider",
      desc: "Nodemailer delivers an HTML email via SMTP containing the temporary verification link.",
    },
    {
      step: "04",
      title: "Atomic Claim & Verification",
      desc: "Client submits the token to the backend, which atomically burns the token and confirms single-use status.",
    },
    {
      step: "05",
      title: "Secure Session Established",
      desc: "Server issues an encrypted, HTTP-only cookie and grants access to the protected /dashboard route.",
    },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full border-b border-slate-200/80 bg-white px-4 py-16 sm:px-6 sm:py-24 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
              <span>College IDP Project &bull; Passwordless Authentication</span>
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl lg:text-5xl leading-tight">
            Cryptographically Hardened <br className="hidden sm:inline" />
            Passwordless Authentication
          </h1>

          <p className="mx-auto max-w-xl text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            A complete web application delivering temporary, single-use magic links via Email.
            Engineered with pure Supabase PostgreSQL, SHA-256 hashing at rest, and HTTP-only session
            cookies.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="primary"
                className="w-full sm:w-auto gap-2 text-sm font-semibold"
              >
                <span>Launch Authentication Flow</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-sm font-medium">
                Access Protected Dashboard
              </Button>
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
              Zero Plaintext Passwords
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
              Single-Use Atomic Claims
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
              No Supabase Auth SDK
            </span>
          </div>
        </div>
      </section>

      {/* Authentication Architecture Flow */}
      <section className="w-full max-w-5xl px-4 py-16 sm:px-6 border-b border-slate-200/80 dark:border-slate-800">
        <div className="text-center mb-10 space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Lifecycle Overview
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            How The Authentication Loop Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            From user submission to database-backed session establishment in five resilient stages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {authFlowSteps.map((step) => (
            <div
              key={step.step}
              className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                  {step.step}
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Email Delivery */}
      <section className="w-full max-w-5xl px-4 py-16 sm:px-6 border-b border-slate-200/80 dark:border-slate-800">
        <div className="grid grid-cols-1 gap-4">
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center gap-3.5 space-y-0 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Email Magic Link</CardTitle>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Provider: Nodemailer (SMTP)
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Dispatches a responsive HTML transactional email with anti-crawler pre-fetch
                protection and 10-minute token expiration.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Security Architecture Grid */}
      <section className="w-full max-w-5xl px-4 py-16 sm:px-6">
        <div className="text-center mb-10 space-y-1.5">
          <Badge variant="outline" className="text-[10px] py-0.5">
            Security Invariants
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Defense-in-Depth Specification
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Engineered to fulfill university project standards and contemporary web security
            specifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {securityFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <Card
                key={feat.title}
                className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <CardHeader className="pb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 mb-2 border border-slate-200/60 dark:border-slate-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{feat.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {feat.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
