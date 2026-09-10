"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { ageSex, relativeDay } from "@/lib/format";
import { LANGUAGE_LABELS } from "@/lib/types";
import { EmptyQueue } from "@/components/brand/illustrations";
import { PatientAvatar } from "@/components/patients/patient-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PatientsPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  // "/" anywhere on the page focuses search — the one shortcut worth shipping first.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        document.getElementById("patient-search")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: patients, loading } = useAsync(() => api.listPatients(debounced), [debounced]);

  async function startConsult(patientId: string) {
    const c = await api.startConsultation(patientId);
    router.push(`/consult/${c.id}`);
  }

  return (
    <>
      <div className="relative mb-6 overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Image src="/photos/office-consult.jpg" alt="" fill sizes="1100px" className="object-cover object-[50%_40%]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,54,70,0.92)_0%,rgba(15,54,70,0.75)_45%,rgba(15,54,70,0.25)_100%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 p-6 text-white">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/60">Registry</div>
            <h1 className="text-[30px] leading-tight text-white">Patients</h1>
            <p className="mt-1 text-sm text-white/75">Search by name, patient ID or phone number.</p>
          </div>
          <Button variant="secondary" render={<Link href="/patients/new" />}>
            <UserPlus data-icon="inline-start" />
            New patient
          </Button>
        </div>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="patient-search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sunita, SHR-2026-0141, 98450…"
          className="h-10 pl-9 pr-10"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">/</kbd>
      </div>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead className="w-20">Age/Sex</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Last visit</TableHead>
              <TableHead className="w-[210px] text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-3.5 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
                  <TableCell />
                </TableRow>
              ))}

            {patients && patients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <EmptyQueue className="mx-auto mb-3 w-52" />
                  No patients match &ldquo;{debounced}&rdquo;.{" "}
                  <Link href="/patients/new" className="text-primary underline underline-offset-4">
                    Register a new patient
                  </Link>
                </TableCell>
              </TableRow>
            )}

            {patients?.map((p) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/patients/${p.id}`)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <PatientAvatar name={p.fullName} />
                    <div className="leading-tight">
                      <div className="font-medium">{p.fullName}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{p.patientCode}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs tnum">{ageSex(p.ageYears, p.gender)}</TableCell>
                <TableCell className="font-mono text-xs tnum">{p.phone}</TableCell>
                <TableCell className="text-sm">{LANGUAGE_LABELS[p.preferredLanguage].split(" · ")[0]}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.lastVisitAt ? relativeDay(p.lastVisitAt) : <span className="italic">Never</span>}
                  {p.hasOpenDraft && <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-warn">draft open</span>}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1.5">
                    <Button variant="outline" size="sm" render={<Link href={`/patients/${p.id}`} />}>
                      Open
                    </Button>
                    <Button size="sm" onClick={() => startConsult(p.id)}>
                      <Stethoscope data-icon="inline-start" />
                      Consult
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
