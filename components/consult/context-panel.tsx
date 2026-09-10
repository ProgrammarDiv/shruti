"use client";

import Link from "next/link";
import { Mic, Radar, UserRound } from "lucide-react";
import { formatDate, relativeDay } from "@/lib/format";
import { getSection } from "@/lib/clinical";
import type { Consultation, Patient } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel } from "./voice-panel";

export type PanelTab = "context" | "voice" | "gaps";

export function ContextPanel({
  patient,
  lastSigned,
  tab,
  onTabChange,
  gapCount,
  voice,
  gaps,
}: {
  patient: Patient;
  lastSigned?: Consultation;
  tab: PanelTab;
  onTabChange: (t: PanelTab) => void;
  gapCount: number;
  voice: React.ReactNode;
  gaps: React.ReactNode;
}) {
  return (
    <Tabs value={tab} onValueChange={(v) => onTabChange(v as PanelTab)} className="gap-3">
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
          {gapCount > 0 && <span className="ml-1 rounded-full bg-warn-soft px-1.5 font-mono text-[10px] text-warn tnum">{gapCount}</span>}
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

      <TabsContent value="voice">{voice}</TabsContent>
      <TabsContent value="gaps">{gaps}</TabsContent>
    </Tabs>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}
