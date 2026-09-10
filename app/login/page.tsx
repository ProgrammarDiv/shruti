"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LogIn, Sparkles } from "lucide-react";
import { DEMO_LOGIN, hasSupabase } from "@/lib/env";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Wordmark } from "@/components/brand/logo";
import { Hero } from "@/components/brand/hero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.15fr_1fr]">
      <aside className="hidden overflow-hidden lg:block">
        <Hero />
      </aside>
      <section className="flex items-center justify-center px-6 py-10">
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e?: React.FormEvent, creds?: { email: string; password: string }) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const { email: em, password: pw } = creds ?? { email, password };
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: em, password: pw });
    if (error) {
      // One message whatever went wrong — never confirm whether the email exists.
      setError("Invalid email or password.");
      setBusy(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="w-full max-w-[400px]">
      <Wordmark className="mb-10" />

      <h2 className="text-[30px] leading-tight">{hasSupabase ? "Sign in to your clinic" : "Welcome to the demo"}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {hasSupabase ? "Use the account your clinic administrator created for you." : "Eight seeded patients, no sign-in, nothing leaves this browser."}
      </p>

      {hasSupabase ? (
        <form onSubmit={signIn} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@clinic.in" className="h-10" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
          </div>
          {error && (
            <p className="rounded-md border border-flag/30 bg-flag-soft px-3 py-2 text-sm text-flag" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="mt-1 h-11" disabled={busy || !email || !password}>
            <LogIn data-icon="inline-start" />
            {busy ? "Signing in…" : "Sign in"}
            <ArrowRight data-icon="inline-end" />
          </Button>

          <div className="relative my-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground before:absolute before:top-1/2 before:left-0 before:h-px before:w-[42%] before:bg-border after:absolute after:top-1/2 after:right-0 after:h-px after:w-[42%] after:bg-border">
            or
          </div>

          {/* Exists so nobody fat-fingers a password on stage. Remove before any real deployment. */}
          <Button type="button" variant="outline" size="lg" className="h-11" disabled={busy} onClick={() => signIn(undefined, DEMO_LOGIN)}>
            <Sparkles data-icon="inline-start" />
            Demo login as Dr. Anjali Rao
          </Button>
        </form>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" className="h-11" render={<Link href="/dashboard" />}>
            <Sparkles data-icon="inline-start" />
            Open the demo clinic
            <ArrowRight data-icon="inline-end" />
          </Button>
          <p className="text-xs text-muted-foreground">
            Add Supabase credentials to <code className="rounded bg-muted px-1 font-mono">.env.local</code> to enable real accounts.
          </p>
        </div>
      )}

      <dl className="mt-10 grid grid-cols-3 gap-3 border-t pt-6">
        <Stat value="6" label="languages" />
        <Stat value="< 3 min" label="per case" />
        <Stat value="100%" label="doctor-verified" />
      </dl>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">Shruti records what was said and what the doctor decided. It does not diagnose, prescribe or triage.</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-lg font-semibold tracking-tight tnum">{value}</dt>
      <dd className="m-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dd>
    </div>
  );
}
