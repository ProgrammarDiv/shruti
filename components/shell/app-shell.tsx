"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, UserPlus } from "lucide-react";
import { cn } from "cn";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { DoctorCard } from "./doctor-card";
import { ResetDemoButton } from "./reset-demo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar print:hidden">
        <div className="px-5 pt-5 pb-4">
          <Wordmark />
        </div>

        <nav className="flex flex-col gap-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pt-3">
          <Button render={<Link href="/patients/new" />} variant="outline" className="w-full justify-start">
            <UserPlus data-icon="inline-start" />
            New patient
          </Button>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-sidebar-border p-3">
          <DoctorCard />
          <ResetDemoButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {/* The consultation workspace uses the full width; every other page reads better measured. */}
        <div className={cn("mx-auto w-full print:max-w-none print:p-0", pathname.startsWith("/consult/") ? "max-w-none px-6 py-5" : "max-w-[1180px] px-8 py-7")}>{children}</div>
      </main>
    </div>
  );
}
