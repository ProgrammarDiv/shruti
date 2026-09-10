"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Stethoscope, Phone, MapPin, Droplet, Languages, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { ageSex, formatDate, formatDateTime, relativeDay } from "@/lib/format";
import { getSection } from "@/lib/clinical";
import { LANGUAGE_LABELS } from "@/lib/types";
import { AllergyBanner } from "@/components/patients/allergy-banner";
import { PatientAvatar } from "@/components/patients/patient-avatar";
import { StatusBadge, CompletenessRing } from "@/components/consult/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientPage({ params }: PageProps<"/patients/[id]">) {
  const { id } = use(params);
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const { data, loading, error } = useAsync(
    async () => {
      const [patient, consultations] = await Promise.all([api.getPatient(id), api.listConsultations(id)]);
      return { patient, consultations };
    },
    [id],
  );

  const patient = data?.patient;
  const consultations = data?.consultations ?? [];
  const openDraft = consultations.find((c) => c.status === "draft");
  const lastSigned = consultations.find((c) => c.status === "signed");

  async function startConsult() {
    setStarting(true);
    const c = await api.startConsultation(id);
    router.push(`/consult/${c.id}`);
  }

  if (!loading && !patient) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">{error ?? "This patient does not exist."}</p>
        <Button variant="outline" className="mt-4" render={<Link href="/patients" />}>
          Back to patients
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground" render={<Link href="/patients" />}>
        <ArrowLeft data-icon="inline-start" />
        Patients
      </Button>

      {/* Header — the persistent patient identity block */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {patient ? <PatientAvatar name={patient.fullName} className="size-14 text-base" /> : <Skeleton className="size-14 rounded-full" />}
          <div>
            {patient ? (
              <>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight">{patient.fullName}</h1>
                  <span className="font-mono text-sm text-muted-foreground tnum">{ageSex(patient.ageYears, patient.gender)}</span>
                  <span className="font-mono text-xs text-muted-foreground">{patient.patientCode}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" />{patient.phone}</span>
                  <span className="inline-flex items-center gap-1.5"><Languages className="size-3.5" />{LANGUAGE_LABELS[patient.preferredLanguage]}</span>
                  {patient.bloodGroup && <span className="inline-flex items-center gap-1.5"><Droplet className="size-3.5" />{patient.bloodGroup}</span>}
                  {patient.address && <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{patient.address}</span>}
                </div>
                <AllergyBanner allergies={patient.allergies} className="mt-3" />
              </>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-80" />
                <Skeleton className="h-7 w-40" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {openDraft ? (
            <Button size="lg" render={<Link href={`/consult/${openDraft.id}`} />}>
              <Stethoscope data-icon="inline-start" />
              Continue draft
            </Button>
          ) : (
            <Button size="lg" onClick={startConsult} disabled={!patient || starting}>
              <Stethoscope data-icon="inline-start" />
              {starting ? "Starting…" : "Start consultation"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Visit timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            )}
            {!loading && consultations.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No visits yet. Start the first consultation.</p>
            )}
            <ol className="relative flex flex-col gap-0 border-l border-border pl-5">
              {consultations.map((c) => (
                <li key={c.id} className="relative pb-5 last:pb-0">
                  <span className={`absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-card ${c.status === "signed" ? "bg-good" : "bg-warn"}`} />
                  <Link href={`/consult/${c.id}`} className="-m-2 block rounded-lg p-2 transition-colors hover:bg-muted/60">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground tnum">{formatDate(c.startedAt)}</span>
                      <span className="text-xs text-muted-foreground">· {relativeDay(c.startedAt)}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{c.visitType}</span>
                      <StatusBadge status={c.status} className="ml-auto" />
                      <CompletenessRing value={c.completenessScore} size={28} />
                    </div>
                    <div className="mt-1 font-medium">{c.chiefComplaint ?? "Untitled consultation"}</div>
                    {c.status === "signed" && (
                      <div className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{getSection(c, "plan")?.content}</div>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Context column */}
        <div className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Current medications</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {loading ? <Skeleton className="h-10 w-full" /> : lastSigned ? getSection(lastSigned, "medications")?.content || <Empty /> : <Empty />}
              {lastSigned && <div className="mt-2 font-mono text-[11px] text-muted-foreground">from visit on {formatDate(lastSigned.startedAt)}</div>}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Last visit summary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : lastSigned?.summary ? (
                <pre className="font-sans whitespace-pre-wrap text-sm leading-relaxed">{lastSigned.summary}</pre>
              ) : (
                <Empty />
              )}
            </CardContent>
          </Card>

          {patient && (
            <Card size="sm">
              <CardContent className="text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Clock className="size-3.5" />Registered {formatDateTime(patient.createdAt)}</div>
                {patient.consentGiven && <div className="mt-1">Consent recorded {formatDateTime(patient.consentAt)}</div>}
                {patient.abhaNumber && <div className="mt-1 font-mono">ABHA {patient.abhaNumber}</div>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Empty() {
  return <span className="text-muted-foreground">Nothing recorded yet.</span>;
}
