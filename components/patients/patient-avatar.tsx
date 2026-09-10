import { cn } from "cn";
import { initials } from "@/lib/format";

// A stable hue per name so the same patient always gets the same colour.
function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function PatientAvatar({ name, className }: { name: string; className?: string }) {
  const hue = hueOf(name);
  return (
    <span
      className={cn("grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold", className)}
      style={{ background: `hsl(${hue} 38% 90%)`, color: `hsl(${hue} 42% 30%)`, boxShadow: `inset 0 0 0 1px hsl(${hue} 30% 80%)` }}
    >
      {initials(name)}
    </span>
  );
}
