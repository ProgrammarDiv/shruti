import { AlertTriangle } from "lucide-react";
import { cn } from "cn";

// Shown on every screen that shows a patient. Never hidden behind a hover.
export function AllergyBanner({ allergies, className }: { allergies: string[]; className?: string }) {
  if (!allergies.length) {
    return (
      <div className={cn("inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground", className)}>
        No known allergies
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-2 rounded-md border border-flag/30 bg-flag-soft px-3 py-1.5 text-sm text-flag", className)} role="alert">
      <AlertTriangle className="size-4 shrink-0" />
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">Allergy</span>
      <span className="font-medium">{allergies.join(" · ")}</span>
    </div>
  );
}
