"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CircleAlert, CircleCheck, Lock, Loader2, Printer, RefreshCw, Sparkles, X } from "lucide-react";
import { cn } from "cn";
import { api } from "@/lib/api";
import { ai, type GapReport } from "@/lib/ai";
import { formatDate } from "@/lib/format";
import { SECTION_LABELS, SECTION_ORDER, type Consultation, type Doctor, type Patient, type SectionKey } from "@/lib/types";
import { PatientBar } from "./patient-bar";
import { NoteDocument } from "./note-document";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type SummaryStatus = "none" | "streaming" | "draft" | "accepted";

export function Review({ consultation: c, patient, doctor }: { consultation: Consultation; patient: Patient; doctor: Doctor }) {
  const router = useRouter();
  const [summary, setSummary] = useState(c.summary ?? "");
  const [summaryStatus, setSummaryStatus] = useState<SummaryStatus>(c.summary ? "accepted" : "none");
  const [gaps, setGaps] = useState<GapReport | null>(null);
  const [gapsBusy, setGapsBusy] = useState(false);
  const [attested, setAttested] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const sections = Object.fromEntries(SECTION_ORDER.map((k) => [k, c.sections.find((s) => s.key === k)?.content ?? ""])) as Record<SectionKey, string>;
  const missing = SECTION_ORDER.filter((k) => !sections[k].trim());
  const drafts = SECTION_ORDER.filter((k) => c.sections.find((s) => s.key === k)?.source === "ai_draft" && sections[k].trim());

  // One documentation check on arrival — the reviewer sees what's still open.
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setGapsBusy(true);
      try {
        const report = await ai.detectGaps({
          patient: { ageYears: patient.ageYears, gender: patient.gender, allergies: patient.allergies },
          sections,
          vitals: c.vitals ? { ...c.vitals } : undefined,
          consultationId: c.id,
        });
        if (!cancelled) setGaps(report);
      } finally {
        if (!cancelled) setGapsBusy(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  async function generate() {
    setSummaryStatus("streaming");
    setSummary("");
    setError(null);
    try {
      const full = await ai.summarize(
        {
          patient: { ageYears: patient.ageYears, gender: patient.gender, allergies: patient.allergies },
          sections,
          vitals: c.vitals ? { ...c.vitals } : undefined,
          patientName: patient.fullName,
          date: formatDate(c.startedAt),
          doctorLine: `${doctor.fullName}, ${doctor.qualification}`,
          consultationId: c.id,
        },
        (chunk) => {
          setSummary((s) => s + chunk);
          summaryRef.current?.scrollIntoView({ block: "nearest" });
        },
      );
      setSummary(full);
      setSummaryStatus("draft");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the summary.");
      setSummaryStatus("none");
    }
  }

  async function acceptSummary() {
    await api.setSummary(c.id, summary.trim());
    setSummaryStatus("accepted");
  }

  async function discardSummary() {
    await api.setSummary(c.id, "");
    setSummary("");
    setSummaryStatus("none");
  }

  async function sign() {
    setSigning(true);
    setError(null);
    try {
      if (summaryStatus === "accepted" && summary.trim() !== (c.summary ?? "")) await api.setSummary(c.id, summary.trim());
      await api.signConsultation(c.id);
      router.push(`/consult/${c.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign the consultation.");
      setSigning(false);
    }
  }

  const canSign = drafts.length === 0 && attested && !signing && summaryStatus !== "streaming" && summaryStatus !== "draft";

  const summarySlot = (
    <div ref={summaryRef}>
      {summaryStatus === "none" && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">Optional. Drafted only from what is written above — it adds nothing that isn&apos;t already in the note.</p>
          <Button size="sm" onClick={generate} className="print:hidden">
            <Sparkles data-icon="inline-start" />
            Generate summary
          </Button>
        </div>
      )}
      {summaryStatus === "streaming" && (
        <pre className="font-sans min-h-16 whitespace-pre-wrap text-sm leading-relaxed">
          {summary}
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-prov-ai align-middle" />
        </pre>
      )}
      {summaryStatus === "draft" && (
        <>
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="min-h-40 bg-prov-ai-soft/40 text-sm leading-relaxed" spellCheck={false} />
          <div className="mt-2 flex flex-wrap gap-2 print:hidden">
            <Button size="sm" onClick={acceptSummary}>
              <Check data-icon="inline-start" />
              Accept summary
            </Button>
            <Button size="sm" variant="outline" onClick={generate}>
              <RefreshCw data-icon="inline-start" />
              Regenerate
            </Button>
            <Button size="sm" variant="ghost" onClick={discardSummary}>
              <X data-icon="inline-start" />
              Discard
            </Button>
          </div>
        </>
      )}
      {summaryStatus === "accepted" && (
        <>
          <pre className="font-sans whitespace-pre-wrap text-sm leading-relaxed">{summary}</pre>
          <div className="mt-2 flex gap-2 print:hidden">
            <Button size="sm" variant="ghost" onClick={() => setSummaryStatus("draft")}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={discardSummary}>
              Remove
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <PatientBar patient={patient} consultation={c} completeness={gaps?.completenessScore ?? c.completenessScore} saveState="idle" />

      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="outline" size="sm" render={<Link href={`/consult/${c.id}`} />}>
          <ArrowLeft data-icon="inline-start" />
          Back to editing
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer data-icon="inline-start" />
          Print
        </Button>
        <span className="ml-2 text-sm text-muted-foreground">Read the whole note once as the next doctor will read it.</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <NoteDocument consultation={c} patient={patient} doctor={doctor} summaryStatus={summaryStatus === "accepted" ? "accepted" : summaryStatus === "draft" || summaryStatus === "streaming" ? "draft" : undefined} summarySlot={summarySlot} />

        {/* Before-you-sign checklist */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-[88px] lg:self-start print:hidden">
          <Panel title="Before you sign">
            <ul className="flex flex-col gap-2 text-sm">
              <CheckItem ok={drafts.length === 0} warn={drafts.length > 0} label={drafts.length ? `${drafts.length} AI draft${drafts.length > 1 ? "s" : ""} not yet accepted` : "Every AI-drafted section has been accepted or rejected"} detail={drafts.length ? drafts.map((k) => SECTION_LABELS[k]).join(", ") + " — go back and decide." : undefined} block />
              <CheckItem ok={missing.length === 0} warn={missing.length > 0} label={missing.length ? `${missing.length} section${missing.length > 1 ? "s" : ""} not documented` : "All sections documented"} detail={missing.length ? missing.map((k) => SECTION_LABELS[k]).join(", ") : undefined} />
              <CheckItem ok={!!c.vitals} warn={!c.vitals} label={c.vitals ? "Vitals recorded" : "No vitals recorded"} />
              <CheckItem ok={summaryStatus === "accepted"} warn={summaryStatus === "draft" || summaryStatus === "streaming"} label={summaryStatus === "accepted" ? "Summary accepted" : summaryStatus === "none" ? "No summary (optional)" : "Summary drafted — accept or discard"} />
            </ul>
          </Panel>

          <Panel title="Documentation check" meta={gapsBusy ? "checking…" : gaps ? `${gaps.completenessScore}%` : undefined}>
            {gapsBusy && !gaps && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Reading the record…
              </div>
            )}
            {gaps && gaps.gaps.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-good">
                <CircleCheck className="size-4" />
                Nothing a complete record would normally include is missing.
              </div>
            )}
            {gaps && gaps.gaps.length > 0 && (
              <ul className="flex flex-col gap-2 text-sm">
                {gaps.gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", g.severity === "high" ? "bg-flag" : g.severity === "medium" ? "bg-warn" : "bg-muted-foreground/50")} />
                    <span className="leading-snug">{g.observation}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Reminders, not blocks. You can sign with open gaps.</p>
          </Panel>

          <Panel title="Sign">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
              <span>I have reviewed this note and it records the consultation as it took place.</span>
            </label>
            <Button className="mt-3 w-full" size="lg" onClick={sign} disabled={!canSign}>
              <Lock data-icon="inline-start" />
              {signing ? "Signing…" : "Sign & lock"}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Signing as {doctor.fullName} · Reg. {doctor.regNumber}. Once signed, the note cannot be edited — corrections are added as dated addenda.
            </p>
            {error && <p className="mt-2 text-sm text-flag">{error}</p>}
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Panel({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{title}</h4>
        {meta && <span className="font-mono text-[11px] text-muted-foreground tnum">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function CheckItem({ ok, warn, label, detail, block }: { ok: boolean; warn?: boolean; label: string; detail?: string; block?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-good" /> : <CircleAlert className={cn("mt-0.5 size-4 shrink-0", block ? "text-flag" : warn ? "text-warn" : "text-muted-foreground")} />}
      <span>
        <span className={cn(block && !ok && "font-medium text-flag")}>{label}</span>
        {detail && <span className="block text-xs text-muted-foreground">{detail}</span>}
      </span>
    </li>
  );
}
