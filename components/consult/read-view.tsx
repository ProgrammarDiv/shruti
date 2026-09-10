"use client";

import { Lock } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { bmiCategory, flagVital, VITAL_RANGES } from "@/lib/clinical";
import { SECTION_LABELS, SECTION_ORDER, type Consultation, type Doctor, type VitalsInput } from "@/lib/types";
import { ProvenanceBadge } from "@/components/consult/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// The locked note. Signed consultations render here; there is no edit path.
export function ConsultationReadView({ consultation: c, doctor }: { consultation: Consultation; doctor: Doctor }) {
  const v = c.vitals;
  return (
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
                  {s && s.content && <ProvenanceBadge source={s.source} carried={!!s.carriedFrom} />}
                </div>
                {s?.content ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{s.content}</p> : <p className="text-sm italic text-muted-foreground">Not documented.</p>}
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
                <Vital
                  label="BP"
                  value={v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : undefined}
                  unit="mmHg"
                  flag={flagVital("bpSystolic", v.bpSystolic) !== "normal" || flagVital("bpDiastolic", v.bpDiastolic) !== "normal"}
                />
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

        <Card size="sm">
          <CardContent className="text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Lock className="size-3.5" />
              Signed and locked
            </div>
            <div className="mt-1">
              {doctor.fullName}, {doctor.qualification}
            </div>
            <div className="font-mono">Reg. {doctor.regNumber}</div>
            <div className="mt-1">{formatDateTime(c.signedAt)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
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
