"use client";

import Link from "next/link";
import { ArrowLeft, Check, CloudOff, Loader2, PenLine } from "lucide-react";
import { cn } from "cn";
import { ageSex, formatTime } from "@/lib/format";
import { LANGUAGE_LABELS, type Consultation, type Patient } from "@/lib/types";
import { AllergyBanner } from "@/components/patients/allergy-banner";
import { PatientAvatar } from "@/components/patients/patient-avatar";
import { StatusBadge, CompletenessRing } from "@/components/consult/status-badge";
import { Button } from "@/components/ui/button";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function PatientBar({
  patient,
  consultation,
  completeness,
  saveState,
  lastSavedAt,
  onSign,
}: {
  patient: Patient;
  consultation: Consultation;
  completeness: number;
  saveState: SaveState;
  lastSavedAt?: string;
  onSign?: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-6 -mt-5 mb-5 border-b bg-background/95 px-6 pt-3 pb-3 backdrop-blur print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" render={<Link href={`/patients/${patient.id}`} />} aria-label="Back to patient">
          <ArrowLeft />
        </Button>
        <PatientAvatar name={patient.fullName} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">{patient.fullName}</h1>
            <span className="font-mono text-sm text-muted-foreground tnum">{ageSex(patient.ageYears, patient.gender)}</span>
            <span className="font-mono text-xs text-muted-foreground">{patient.patientCode}</span>
            <StatusBadge status={consultation.status} />
          </div>
          <div className="text-xs text-muted-foreground">
            {consultation.visitType === "new" ? "New visit" : "Follow-up"} · started {formatTime(consultation.startedAt)} · {LANGUAGE_LABELS[consultation.languageUsed]}
          </div>
        </div>

        <AllergyBanner allergies={patient.allergies} className="ml-2" />

        <div className="ml-auto flex items-center gap-4">
          <SaveIndicator state={saveState} at={lastSavedAt} />
          <div className="flex items-center gap-2">
            <CompletenessRing value={completeness} size={34} />
            <span className="hidden text-xs text-muted-foreground xl:inline">documented</span>
          </div>
          {onSign && (
            <Button onClick={onSign}>
              <PenLine data-icon="inline-start" />
              Review &amp; sign
              <kbd className="ml-1 rounded border border-primary-foreground/30 px-1 font-mono text-[10px] font-normal opacity-80">Ctrl+↵</kbd>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ state, at }: { state: SaveState; at?: string }) {
  const base = "inline-flex items-center gap-1.5 font-mono text-[11px] tnum";
  switch (state) {
    case "saving":
      return (
        <span className={cn(base, "text-muted-foreground")}>
          <Loader2 className="size-3.5 animate-spin" />
          Saving…
        </span>
      );
    case "dirty":
      return <span className={cn(base, "text-warn")}>Unsaved changes</span>;
    case "error":
      return (
        <span className={cn(base, "text-flag")}>
          <CloudOff className="size-3.5" />
          Not saved — retrying
        </span>
      );
    case "saved":
      return (
        <span className={cn(base, "text-good")}>
          <Check className="size-3.5" />
          Saved {at ? formatTime(at) : ""}
        </span>
      );
    default:
      return <span className={cn(base, "text-muted-foreground")}>Autosave on</span>;
  }
}
