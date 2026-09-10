"use client";

import Link from "next/link";
import { Printer, UserRound } from "lucide-react";
import type { Consultation, Doctor, Patient } from "@/lib/types";
import { NoteDocument } from "./note-document";
import { Button } from "@/components/ui/button";

// The locked note. Signed consultations render here; there is no edit path.
export function ConsultationReadView({ consultation: c, patient, doctor }: { consultation: Consultation; patient: Patient; doctor: Doctor }) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="outline" size="sm" render={<Link href={`/patients/${patient.id}`} />}>
          <UserRound data-icon="inline-start" />
          Patient timeline
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer data-icon="inline-start" />
          Print
        </Button>
        <span className="ml-2 text-sm text-muted-foreground">Signed and locked. Corrections are added as dated addenda, never edits.</span>
      </div>
      <NoteDocument consultation={c} patient={patient} doctor={doctor} summary={c.summary || undefined} summaryStatus={c.summary ? "accepted" : undefined} />
    </>
  );
}
