"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mic, LogIn } from "lucide-react";
import { DEMO_LOGIN, hasSupabase } from "@/lib/env";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
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
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Mic className="size-5" />
          </span>
          <div className="leading-tight">
            <div className="text-xl font-semibold tracking-tight">Shruti</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Speak the case. Sign the record.</div>
          </div>
        </div>

        {hasSupabase ? (
          <form onSubmit={signIn} className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@clinic.in" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <p className="text-sm text-flag">{error}</p>}
              <Button type="submit" size="lg" disabled={busy || !email || !password}>
                <LogIn data-icon="inline-start" />
                {busy ? "Signing in…" : "Sign in"}
              </Button>
              {/* Exists so nobody fat-fingers a password on stage. Remove before any real deployment. */}
              <Button type="button" variant="outline" disabled={busy} onClick={() => signIn(undefined, DEMO_LOGIN)}>
                Demo login
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">
              Running on demo data with no sign-in. Add Supabase credentials to <code className="rounded bg-muted px-1 font-mono text-xs">.env.local</code> to enable accounts.
            </p>
            <Button className="mt-4 w-full" size="lg" render={<Link href="/dashboard" />}>
              Open the dashboard
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">Clinical documentation assistant. Records what was said and what the doctor decided; makes no clinical decisions.</p>
      </div>
    </main>
  );
}
