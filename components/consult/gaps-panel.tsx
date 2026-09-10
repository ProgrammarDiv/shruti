"use client";

import { CircleCheck, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { cn } from "cn";
import { formatTime } from "@/lib/format";
import { SECTION_LABELS, type SectionKey } from "@/lib/types";
import type { GapReport, GapSeverity } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { CompletenessRing } from "./status-badge";
import { Panel } from "./voice-panel";

const SEV: Record<GapSeverity, { dot: string; label: string }> = {
  high: { dot: "bg-flag", label: "High" },
  medium: { dot: "bg-warn", label: "Medium" },
  low: { dot: "bg-muted-foreground/50", label: "Low" },
};

export function GapsPanel({
  report,
  busy,
  fallbackScore,
  onRun,
  onJump,
}: {
  report: GapReport | null;
  busy: boolean;
  fallbackScore: number;
  onRun: () => void;
  onJump: (key: SectionKey | "vitals") => void;
}) {
  const score = report?.completenessScore ?? fallbackScore;
  return (
    <div className="flex flex-col gap-3">
      <Panel title="Documentation check" meta={report ? `checked ${formatTime(report.checkedAt)}` : "not run yet"}>
        <div className="flex items-center gap-3">
          <CompletenessRing value={score} size={48} />
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-semibold tracking-tight tnum">
              {score}
              <span className="text-sm font-normal text-muted-foreground">%</span>
            </div>
            <div className="text-xs text-muted-foreground">{report ? `${report.gaps.length} gap${report.gaps.length === 1 ? "" : "s"} found` : "Runs automatically after you save"}</div>
          </div>
          <Button variant="outline" size="sm" onClick={onRun} disabled={busy}>
            {busy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <RefreshCw data-icon="inline-start" />}
            {busy ? "Checking" : "Re-check"}
          </Button>
        </div>
      </Panel>

      <Panel title="Gaps" meta={report ? report.model : undefined}>
        {!report && !busy && <p className="text-muted-foreground">Nothing checked yet.</p>}
        {busy && !report && <p className="text-muted-foreground">Reading the record…</p>}
        {report && report.gaps.length === 0 && (
          <div className="flex items-center gap-2 text-good">
            <CircleCheck className="size-4" />
            Nothing a complete record would normally include is missing.
          </div>
        )}
        {report && report.gaps.length > 0 && (
          <ul className={cn("flex flex-col gap-1", busy && "opacity-60")}>
            {report.gaps.map((g, i) => (
              <li key={i}>
                <button type="button" onClick={() => onJump(g.section)} className="flex w-full items-start gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-muted">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", SEV[g.severity].dot)} title={SEV[g.severity].label} />
                  <span className="min-w-0">
                    <span className="block leading-snug">{g.observation}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em]">{g.section === "vitals" ? "Vitals" : SECTION_LABELS[g.section]}</span> · {g.why}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {report && report.strengths.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 border-t pt-2.5">
            {report.strengths.map((s) => (
              <li key={s} className="flex items-center gap-2 text-xs text-good">
                <CircleCheck className="size-3.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="flex items-start gap-2 px-1 text-[11px] leading-snug text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        Checks the record, not the patient. It flags what isn&apos;t documented — it never suggests a diagnosis, a test or a treatment.
      </div>
    </div>
  );
}
