"use client";

import { use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { Workspace } from "@/components/consult/workspace";
import { ConsultationReadView } from "@/components/consult/read-view";
import { PatientBar } from "@/components/consult/patient-bar";
import { Skeleton } from "@/components/ui/skeleton";

// Draft → the editable workspace. Signed → the locked note.
export default function ConsultationPage({ params }: PageProps<"/consult/[id]">) {
  const { id } = use(params);
  const { data, loading } = useAsync(
    async () => {
      const consultation = await api.getConsultation(id);
      if (!consultation) return null;
      const [patient, doctor, history] = await Promise.all([api.getPatient(consultation.patientId), api.getCurrentDoctor(), api.listConsultations(consultation.patientId)]);
      return { consultation, patient, doctor, history };
    },
    [id],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <div className="grid gap-5 lg:grid-cols-[188px_minmax(0,1fr)_300px]">
          <Skeleton className="h-64" />
          <Skeleton className="h-[520px]" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }
  if (!data || !data.patient) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Consultation not found.{" "}
        <Link href="/dashboard" className="text-primary underline underline-offset-4">
          Dashboard
        </Link>
      </div>
    );
  }

  const { consultation, patient, doctor, history } = data;

  if (consultation.status === "draft") {
    return <Workspace key={consultation.id} consultation={consultation} patient={patient} history={history} />;
  }

  return (
    <>
      <PatientBar patient={patient} consultation={consultation} completeness={consultation.completenessScore} saveState="idle" />
      <ConsultationReadView consultation={consultation} patient={patient} doctor={doctor} />
    </>
  );
}
