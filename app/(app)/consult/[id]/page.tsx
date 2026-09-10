"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { ageSex, formatDateTime } from "@/lib/format";
import { bmiCategory, flagVital, VITAL_RANGES } from "@/lib/clinical";
import { SECTION_LABELS, SECTION_ORDER, LANGUAGE_LABELS, type VitalsInput } from "@/lib/types";
import { AllergyBanner } from "@/components/patients/allergy-banner";
import { PatientAvatar } from "@/components/patients/patient-avatar";
import { ProvenanceBadge, StatusBadge, CompletenessRing } from "@/components/consult/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Step 1: a read view of any consultation. Step 2 replaces the draft branch
// with the editable three-pane workspace; the signed branch stays as the
// locked-note view.
export default function ConsultationPage({ params }: PageProps<"/consult/[id]">) {
  const { id } = use(params);
  const { data, loading } = useAsync(
    async () => {
      const consultation = await api.getConsultation(id);
      if (!consultation) return null;
      const [patient, doctor] = await Promise.all([api.getPatient(consultation.patientId), api.getCurrentDoctor()]);
      return { consultation, patient, doctor };
    },
    [id],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!data || !data.patient) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Consultation not found.{" "}
        <Link href="/dashboard" className="text-primary underline underline-offset-4">Dashboard</Link>
      </div>
    );
  }

  const { consultation: c, patient, doctor } = data;
  const v = c.vitals;

  return (
    <>
      <Button variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground" render={<Link href={`/patients/${patient.id}`} />}>
        <ArrowLeft data-icon="inline-start" />
        {patient.fullName}
      </Button>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <PatientAvatar name={patient.fullName} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{patient.fullName}</h1>
            <span className="font-mono text-sm text-muted-foreground tnum">{ageSex(patient.ageYears, patient.gender)}</span>
            <span className="font-mono text-xs text-muted-foreground">{patient.patientCode}</span>
            <StatusBadge status={c.status} />
          </div>
          <div className="text-sm text-muted-foreground">
            {c.visitType === "new" ? "New visit" : "Follow-up"} · {formatDateTime(c.startedAt)} · {LANGUAGE_LABELS[c.languageUsed]}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <CompletenessRing value={c.completenessScore} />
        </div>
      </div>

      <AllergyBanner allergies={patient.allergies} className="mb-5" />

      {c.status === "draft" && (
        <Card className="mb-4 border-dashed">
          <CardContent className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Draft consultation.</span> The editable workspace — sections, vitals entry, voice capture and AI structuring — arrives in Step 2. For now this is a read-only view of what has been recorded.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Case sheet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {SECTION_ORDER.map((key) => {
              const s = c.sections.find((x) => x.key === key);
              return (
                <div key={key} className="py-4 first:pt-0 last:pb-0">
                  <div className="mb-1.5 flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{SECTION_LABELS[key]}</h3>
                    {s && s.content && <ProvenanceBadge source={s.source} />}
                  </div>
                  {s?.content ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{s.content}</p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">Not documented.</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Vitals</CardTitle>
            </CardHeader>
            <CardContent>
              {v ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  <Vital label="BP" value={v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : undefined} unit="mmHg" flag={flagVital("bpSystolic", v.bpSystolic) !== "normal" || flagVital("bpDiastolic", v.bpDiastolic) !== "normal"} />
                  {(["pulseBpm", "temperatureF", "respRate", "spo2Percent", "heightCm", "weightKg"] as Array<keyof VitalsInput>).map((k) => (
                    <Vital key={k} label={VITAL_RANGES[k].label} value={v[k]} unit={VITAL_RANGES[k].unit} flag={flagVital(k, v[k]) !== "normal"} />
                  ))}
                  <Vital label="BMI" value={v.bmi} unit={bmiCategory(v.bmi) ?? ""} flag={v.bmi !== undefined && (v.bmi < 18.5 || v.bmi >= 25)} />
                </dl>
              ) : (
                <p className="text-sm italic text-muted-foreground">Not recorded.</p>
              )}
            </CardContent>
          </Card>

          {c.summary && (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Clinical summary</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="font-sans whitespace-pre-wrap text-sm leading-relaxed">{c.summary}</pre>
              </CardContent>
            </Card>
          )}

          {c.status === "signed" && (
            <Card size="sm">
              <CardContent className="text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-foreground"><Lock className="size-3.5" />Signed and locked</div>
                <div className="mt-1">{doctor.fullName}, {doctor.qualification}</div>
                <div className="font-mono">Reg. {doctor.regNumber}</div>
                <div className="mt-1">{formatDateTime(c.signedAt)}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Vital({ label, value, unit, flag }: { label: string; value?: number | string; unit: string; flag?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className={`font-mono text-sm tnum ${flag ? "font-semibold text-flag" : ""}`}>
        {value ?? "—"} <span className="text-xs font-normal text-muted-foreground">{value !== undefined ? unit : ""}</span>
      </dd>
    </div>
  );
}
