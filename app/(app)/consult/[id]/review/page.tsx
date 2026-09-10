"use client";

import { use } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { Review } from "@/components/consult/review";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewPage({ params }: PageProps<"/consult/[id]/review">) {
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
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-[640px] w-full max-w-[860px]" />
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
  // A signed note has nothing left to review.
  if (data.consultation.status === "signed") redirect(`/consult/${id}`);

  return <Review consultation={data.consultation} patient={data.patient} doctor={data.doctor} />;
}
