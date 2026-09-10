"use client";

import Link from "next/link";
import { Mic, Radar, UserRound, CircleAlert, CircleCheck } from "lucide-react";
import { formatDate, relativeDay } from "@/lib/format";
import { getSection } from "@/lib/clinical";
import { LANGUAGE_LABELS, SECTION_LABELS, SECTION_ORDER, type CaseSection, type Consultation, type Patient, type SectionKey } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export function ContextPanel({
  patient,
  consultation,
  lastSigned,
  sections,
  onJump,
}: {
  patient: Patient;
  consultation: Consultation;
  lastSigned?: Consultation;
  sections: Record<SectionKey, CaseSection>;
  onJump: (key: SectionKey) => void;
}) {
  const missing = SECTION_ORDER.filter((k) => !sections[k].content.trim());

  return (
    <Tabs defaultValue="context" className="gap-3">
      <TabsList className="w-full">
        <TabsTrigger value="context">
          <UserRound data-icon="inline-start" />
          Context
        </TabsTrigger>
        <TabsTrigger value="voice">
          <Mic data-icon="inline-start" />
          Voice
        </TabsTrigger>
        <TabsTrigger value="gaps">
          <Radar data-icon="inline-start" />
          Gaps
          {missing.length > 0 && <span className="ml-1 rounded-full bg-warn-soft px-1.5 font-mono text-[10px] text-warn">{missing.length}</span>}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="context" className="flex flex-col gap-3">
        <Panel title="Allergies">
          {patient.allergies.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {patient.allergies.map((a) => (
                <li key={a} className="rounded-md border border-flag/30 bg-flag-soft px-2 py-0.5 text-xs font-medium text-flag">
                  {a}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No known allergies.</Empty>
          )}
        </Panel>

        <Panel title="Current medications" meta={lastSigned ? `as of ${formatDate(lastSigned.startedAt)}` : undefined}>
          {lastSigned ? getSection(lastSigned, "medications")?.content || <Empty>None recorded.</Empty> : <Empty>First visit — nothing on file.</Empty>}
        </Panel>

        <Panel title="Last visit" meta={lastSigned ? relativeDay(lastSigned.startedAt) : undefined}>
          {lastSigned ? (
            <div className="space-y-2">
              <div className="font-medium">{lastSigned.chiefComplaint}</div>
              <p className="text-muted-foreground">{getSection(lastSigned, "plan")?.content}</p>
              <Link href={`/consult/${lastSigned.id}`} className="inline-block text-xs text-primary underline underline-offset-4">
                Open full note
              </Link>
            </div>
          ) : (
            <Empty>No previous visits.</Empty>
          )}
        </Panel>
      </TabsContent>

      <TabsContent value="voice" className="flex flex-col gap-3">
        <Panel title="Voice capture" meta={LANGUAGE_LABELS[consultation.languageUsed]}>
          <p className="text-muted-foreground">
            Record the consultation in the patient&apos;s language and let Shruti structure it into the sections on the left. Arrives in Step 3.
          </p>
          <Button variant="outline" className="mt-3 w-full" disabled>
            <Mic data-icon="inline-start" />
            Start recording
          </Button>
        </Panel>
      </TabsContent>

      <TabsContent value="gaps" className="flex flex-col gap-3">
        <Panel title="Documentation gaps" meta={`${SECTION_ORDER.length - missing.length}/${SECTION_ORDER.length} sections`}>
          {missing.length === 0 ? (
            <div className="flex items-center gap-2 text-good">
              <CircleCheck className="size-4" />
              Every section has content.
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {missing.map((k) => (
                <li key={k}>
                  <button type="button" onClick={() => onJump(k)} className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted">
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
                    <span>
                      <span className="font-medium">{SECTION_LABELS[k]}</span>
                      <span className="block text-xs text-muted-foreground">Not documented yet</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">Step 3 adds the AI check — it reads what&apos;s written and flags what a complete record would normally include.</p>
        </Panel>
      </TabsContent>
    </Tabs>
  );
}

function Panel({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card p-3.5 text-sm ring-1 ring-foreground/10">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{title}</h4>
        {meta && <span className="truncate text-[11px] text-muted-foreground">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}
