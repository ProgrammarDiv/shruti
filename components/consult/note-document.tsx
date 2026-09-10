"use client";

import { cn } from "cn";
import { ageSex, formatDate, formatDateTime } from "@/lib/format";
import { bmiCategory, flagVital, VITAL_RANGES } from "@/lib/clinical";
import { LANGUAGE_LABELS, SECTION_LABELS, SECTION_ORDER, type Consultation, type Doctor, type Patient, type SectionSource, type VitalsInput } from "@/lib/types";
import { ProvenanceBadge } from "./status-badge";

// The note as a document — what gets reviewed, signed, printed. Used by the
// review page and the locked read view so they can never drift apart.
export function NoteDocument({
  consultation: c,
  patient,
  doctor,
  summary,
  summaryStatus,
  summarySlot,
  className,
}: {
  consultation: Consultation;
  patient: Patient;
  doctor: Doctor;
  summary?: string;
  summaryStatus?: "draft" | "accepted";
  summarySlot?: React.ReactNode; // controls rendered inside the summary block (review page)
  className?: string;
}) {
  const v = c.vitals;
  const vitalItems: Array<{ label: string; value: string; flag: boolean }> = [];
  if (v) {
    if (v.bpSystolic && v.bpDiastolic) vitalItems.push({ label: "BP", value: `${v.bpSystolic}/${v.bpDiastolic} mmHg`, flag: flagVital("bpSystolic", v.bpSystolic) !== "normal" || flagVital("bpDiastolic", v.bpDiastolic) !== "normal" });
    for (const k of ["pulseBpm", "temperatureF", "respRate", "spo2Percent", "heightCm", "weightKg"] as Array<keyof VitalsInput>) {
      if (v[k] !== undefined) vitalItems.push({ label: VITAL_RANGES[k].label, value: `${v[k]} ${VITAL_RANGES[k].unit}`, flag: flagVital(k, v[k]) !== "normal" });
    }
    if (v.bmi !== undefined) vitalItems.push({ label: "BMI", value: `${v.bmi} (${bmiCategory(v.bmi)})`, flag: v.bmi < 18.5 || v.bmi >= 25 });
  }

  const counts = SECTION_ORDER.reduce<Record<SectionSource, number>>(
    (acc, k) => {
      const s = c.sections.find((x) => x.key === k);
      if (s?.content.trim()) acc[s.source] += 1;
      return acc;
    },
    { doctor: 0, ai_draft: 0, ai_accepted: 0, ai_edited: 0 },
  );

  return (
    <article className={cn("mx-auto w-full max-w-[860px] rounded-xl bg-card px-10 py-9 text-[14.5px] leading-relaxed ring-1 ring-foreground/10 print:max-w-none print:rounded-none print:px-0 print:py-0 print:ring-0", className)}>
      {/* Letterhead */}
      <header className="flex items-start justify-between gap-6 border-b-2 border-foreground pb-4">
        <div>
          <div className="text-xl font-semibold tracking-tight">{doctor.clinicName}</div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Outpatient consultation record</div>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold">{doctor.fullName}</div>
          <div className="text-muted-foreground">{doctor.qualification}</div>
          <div className="font-mono text-xs text-muted-foreground">Reg. no. {doctor.regNumber}</div>
        </div>
      </header>

      {/* Patient identity */}
      <dl className="grid grid-cols-2 gap-x-8 gap-y-1.5 border-b py-4 text-sm sm:grid-cols-4">
        <Row label="Patient" value={patient.fullName} />
        <Row label="Age / Sex" value={ageSex(patient.ageYears, patient.gender)} mono />
        <Row label="Patient ID" value={patient.patientCode} mono />
        <Row label="Phone" value={patient.phone} mono />
        <Row label="Date" value={formatDateTime(c.startedAt)} />
        <Row label="Visit" value={c.visitType === "new" ? "New" : "Follow-up"} />
        <Row label="Language" value={LANGUAGE_LABELS[c.languageUsed].split(" · ")[1] ?? LANGUAGE_LABELS[c.languageUsed]} />
        <Row label="Status" value={c.status === "signed" ? `Signed ${formatDate(c.signedAt)}` : "Unsigned draft"} />
      </dl>

      <div className={cn("mt-4 text-sm", patient.allergies.length ? "font-medium text-flag" : "text-muted-foreground")}>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em]">Allergies · </span>
        {patient.allergies.length ? patient.allergies.join("; ") : "No known allergies"}
      </div>

      {/* Vitals */}
      <section className="mt-5">
        <h3 className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Vitals</h3>
        {vitalItems.length ? (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {vitalItems.map((it) => (
              <span key={it.label} className="tnum">
                <span className="text-muted-foreground">{it.label} </span>
                <span className={cn("font-mono", it.flag && "font-semibold text-flag")}>{it.value}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">Not recorded.</p>
        )}
      </section>

      {/* Sections */}
      {SECTION_ORDER.map((key) => {
        const s = c.sections.find((x) => x.key === key);
        const filled = !!s?.content.trim();
        return (
          <section key={key} className="mt-5 break-inside-avoid">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">{SECTION_LABELS[key]}</h3>
              {filled && s && <ProvenanceBadge source={s.source} carried={!!s.carriedFrom} />}
            </div>
            {filled ? <p className="whitespace-pre-wrap">{s!.content}</p> : <p className="italic text-muted-foreground">Not documented.</p>}
          </section>
        );
      })}

      {/* Summary */}
      {(summary !== undefined || summarySlot) && (
        <section className="mt-6 break-inside-avoid rounded-lg border border-dashed p-4 print:border-solid">
          <div className="mb-1.5 flex items-center gap-2">
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Clinical summary</h3>
            {summaryStatus === "draft" && <span className="rounded-full border border-prov-ai/30 bg-prov-ai-soft px-2 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-prov-ai">AI draft — review before signing</span>}
            {summaryStatus === "accepted" && <span className="rounded-full border border-prov-accepted/30 bg-prov-accepted-soft px-2 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-prov-accepted">AI · accepted</span>}
          </div>
          {summarySlot ?? <pre className="font-sans whitespace-pre-wrap text-sm leading-relaxed">{summary}</pre>}
        </section>
      )}

      {/* Provenance legend + attestation */}
      <footer className="mt-8 border-t pt-4 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em]">Provenance</span>
          <Legend source="doctor" n={counts.doctor} />
          <Legend source="ai_accepted" n={counts.ai_accepted} />
          <Legend source="ai_edited" n={counts.ai_edited} />
          {counts.ai_draft > 0 && <Legend source="ai_draft" n={counts.ai_draft} />}
        </div>
        <p className="mt-3">
          AI-assisted sections were drafted from the consultation transcript and {c.status === "signed" ? "reviewed and accepted" : "must be reviewed and accepted"} by the signing doctor. Shruti records what was said and what the doctor decided; it does not make clinical decisions.
        </p>
        <div className="mt-4 flex items-end justify-between gap-6">
          <div>
            {c.status === "signed" ? (
              <>
                <div className="font-medium text-foreground">Electronically signed by {doctor.fullName}</div>
                <div className="font-mono">{formatDateTime(c.signedAt)}</div>
              </>
            ) : (
              <div className="italic">Unsigned — not yet part of the medical record.</div>
            )}
          </div>
          <div className="w-48 border-b border-foreground/60 pb-1 text-center font-mono text-[10px] uppercase tracking-[0.12em]">Signature</div>
        </div>
      </footer>
    </article>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className={cn("m-0", mono && "font-mono text-[13px] tnum")}>{value}</dd>
    </div>
  );
}

function Legend({ source, n }: { source: SectionSource; n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <ProvenanceBadge source={source} />
      <span className="font-mono tnum">{n}</span>
    </span>
  );
}
