"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { hasSupabase } from "@/lib/env";
import { useAsync } from "@/lib/use-async";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function DoctorCard() {
  const { data: doctor } = useAsync(() => api.getCurrentDoctor(), []);
  const router = useRouter();

  async function signOut() {
    const { supabaseBrowser } = await import("@/lib/supabase/browser");
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!doctor) {
    return (
      <div className="flex items-center gap-2.5 px-1.5 py-1">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-1.5 py-1">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
        {initials(doctor.fullName.replace(/^Dr\.?\s*/i, ""))}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-sm font-medium">{doctor.fullName}</div>
        <div className="truncate font-mono text-[11px] text-muted-foreground">{doctor.regNumber}</div>
      </div>
      {hasSupabase && (
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={signOut} aria-label="Sign out" title="Sign out">
          <LogOut />
        </Button>
      )}
    </div>
  );
}
