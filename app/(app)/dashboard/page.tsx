"use client";

import Link from "next/link";
import { ArrowRight, Stethoscope, Users, CalendarDays, PenLine, Gauge } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { ageSex, formatTime, relativeDay } from "@/lib/format";
import { LANGUAGE_LABELS } from "@/lib/types";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyQueue, LanguageMosaic } from "@/components/brand/illustrations";
import { PatientAvatar } from "@/components/patients/patient-avatar";
import { StatusBadge, CompletenessRing } from "@/components/consult/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { data, loading, error } = useAsync(async () => {
    const [dash, doctor] = await Promise.all([api.getDashboard(), api.getCurrentDoctor()]);
    return { ...dash, doctor };
  }, []);

  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const shortName = data?.doctor.fullName.replace(/^Dr\.?\s*/i, "").split(" ").pop();

  return (
    <>
      <div className="relative">
        <PageHeader eyebrow={today} title={`${greeting()}${shortName ? `, Dr. ${shortName}` : ""}`} description="What needs you today." />
        <LanguageMosaic className="pointer-events-none absolute -top-3 right-0 hidden w-[230px] xl:block" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Users />} label="Patients today" value={data?.stats.patientsToday} loading={loading} />
        <Stat icon={<CalendarDays />} label="Consultations this week" value={data?.stats.consultationsThisWeek} loading={loading} />
        <Stat icon={<PenLine />} label="Drafts pending" value={data?.stats.draftsPending} loading={loading} tone={data && data.stats.draftsPending > 0 ? "warn" : undefined} />
        <Stat icon={<Gauge />} label="Avg. completeness" value={data ? `${data.stats.avgCompleteness}%` : undefined} loading={loading} />
      </div>

      {error && <p className="mb-4 text-sm text-flag">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s queue</CardTitle>
            <CardAction>
              <Button variant="outline" size="sm" render={<Link href="/patients" />}>
                All patients
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {loading && <RowSkeletons n={3} />}
            {data && data.todaysQueue.length === 0 && (
              <div className="flex flex-col items-center py-6 text-center">
                <EmptyQueue className="w-56" />
                <p className="mt-2 text-sm text-muted-foreground">No consultations started yet today.</p>
              </div>
            )}
            {data?.todaysQueue.map(({ patient, consultation }) => (
              <div key={consultation.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <PatientAvatar name={patient.fullName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/patients/${patient.id}`} className="truncate font-medium hover:underline">
                      {patient.fullName}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">{ageSex(patient.ageYears, patient.gender)}</span>
                    <StatusBadge status={consultation.status} />
                  </div>
                  <div className="truncate text-sm text-muted-foreground">{consultation.chiefComplaint ?? "No complaint recorded yet"}</div>
                </div>
                <span className="font-mono text-xs text-muted-foreground tnum">{formatTime(consultation.startedAt)}</span>
                <CompletenessRing value={consultation.completenessScore} size={32} />
                <Button size="sm" render={<Link href={`/consult/${consultation.id}`} />}>
                  {consultation.status === "draft" ? "Continue" : "Open"}
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent consultations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {loading && <RowSkeletons n={5} compact />}
            {data?.recentConsultations.map(({ patient, consultation }) => (
              <Link
                key={consultation.id}
                href={`/consult/${consultation.id}`}
                className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors first:pt-0 hover:bg-muted/60"
              >
                <Stethoscope className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="truncate font-medium">{patient.fullName}</span>
                    <span className="truncate text-xs text-muted-foreground">{LANGUAGE_LABELS[consultation.languageUsed].split(" · ")[0]}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{consultation.chiefComplaint}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-[11px] text-muted-foreground tnum">{relativeDay(consultation.startedAt)}</span>
                  <StatusBadge status={consultation.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ icon, label, value, loading, tone }: { icon: React.ReactNode; label: string; value?: number | string; loading: boolean; tone?: "warn" }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg [&>svg]:size-4 ${tone === "warn" ? "bg-warn-soft text-warn" : "bg-accent text-accent-foreground"}`}>{icon}</span>
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
          {loading ? (
            <Skeleton className="mt-1.5 h-7 w-12" />
          ) : (
            <div className={`mt-0.5 text-2xl font-semibold tracking-tight tnum ${tone === "warn" ? "text-warn" : ""}`}>{value ?? "—"}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RowSkeletons({ n, compact }: { n: number; compact?: boolean }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 first:pt-0">
          {!compact && <Skeleton className="size-9 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </>
  );
}
