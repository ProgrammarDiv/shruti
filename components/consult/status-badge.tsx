import { Lock, PenLine } from "lucide-react";
import { cn } from "cn";
import type { ConsultationStatus, SectionSource } from "@/lib/types";

export function StatusBadge({ status, className }: { status: ConsultationStatus; className?: string }) {
  const signed = status === "signed";
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full border px-2 font-mono text-[10px] font-medium uppercase tracking-[0.1em]",
        signed ? "border-good/30 bg-good-soft text-good" : "border-warn/30 bg-warn-soft text-warn",
        className,
      )}
    >
      {signed ? <Lock className="size-3" /> : <PenLine className="size-3" />}
      {signed ? "Signed" : "Draft"}
    </span>
  );
}

const PROV: Record<SectionSource, { label: string; cls: string }> = {
  doctor: { label: "Doctor", cls: "border-prov-doctor/30 bg-prov-doctor-soft text-prov-doctor" },
  ai_draft: { label: "AI draft", cls: "border-prov-ai/30 bg-prov-ai-soft text-prov-ai" },
  ai_accepted: { label: "AI · accepted", cls: "border-prov-accepted/30 bg-prov-accepted-soft text-prov-accepted" },
  ai_edited: { label: "AI · edited", cls: "border-prov-edited/30 bg-prov-edited-soft text-prov-edited" },
};

// The provenance badge. Always visible, never on hover — it is the feature.
export function ProvenanceBadge({ source, className }: { source: SectionSource; className?: string }) {
  const p = PROV[source];
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full border px-2 font-mono text-[10px] font-medium uppercase tracking-[0.1em]", p.cls, className)}>
      {p.label}
    </span>
  );
}

export function CompletenessRing({ value, size = 36, className }: { value: number; size?: number; className?: string }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const tone = value >= 80 ? "text-good" : value >= 50 ? "text-warn" : "text-flag";
  return (
    <span className={cn("relative inline-grid place-items-center", tone, className)} style={{ width: size, height: size }} title={`${value}% documented`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute font-mono text-[10px] font-semibold tnum">{value}</span>
    </span>
  );
}
