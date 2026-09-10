import { cn } from "cn";

// The mark: a microphone capsule inside a sound-wave arc — "that which is heard".
export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("shrink-0", className)} aria-hidden>
      <rect width="40" height="40" rx="10" fill="currentColor" className="text-primary" />
      <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
        <rect x="16" y="9" width="8" height="14" rx="4" fill="#fff" stroke="none" />
        <path d="M12 19a8 8 0 0 0 16 0" />
        <path d="M20 27v4M15.5 31h9" />
        <path d="M8.5 15.5a12 12 0 0 0 0 7" opacity=".55" />
        <path d="M31.5 15.5a12 12 0 0 1 0 7" opacity=".55" />
      </g>
    </svg>
  );
}

export function Wordmark({ className, light }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="leading-tight">
        <div className={cn("text-[17px] font-semibold tracking-tight", light && "text-white")}>Shruti</div>
        <div className={cn("font-mono text-[10px] uppercase tracking-[0.14em]", light ? "text-white/60" : "text-muted-foreground")}>Clinical scribe</div>
      </div>
    </div>
  );
}
