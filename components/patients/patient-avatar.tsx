import { cn } from "cn";
import { initials } from "@/lib/format";

export function PatientAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground", className)}>
      {initials(name)}
    </span>
  );
}
