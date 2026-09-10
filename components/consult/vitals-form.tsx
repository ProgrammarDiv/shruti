"use client";

import { cn } from "cn";
import { bmiCategory, computeBmi, flagVital, VITAL_RANGES } from "@/lib/clinical";
import type { Vitals, VitalsInput } from "@/lib/types";
import { Input } from "@/components/ui/input";

export type VitalsText = Record<keyof VitalsInput, string>;

export const VITAL_KEYS: Array<keyof VitalsInput> = ["bpSystolic", "bpDiastolic", "pulseBpm", "temperatureF", "respRate", "spo2Percent", "heightCm", "weightKg"];

export function vitalsToText(v?: Vitals): VitalsText {
  const out = {} as VitalsText;
  for (const k of VITAL_KEYS) out[k] = v?.[k] !== undefined ? String(v[k]) : "";
  return out;
}

// Parses the text fields. A field is `undefined` when blank, a number when valid,
// and listed in `errors` when it's outside the physically possible range.
export function parseVitals(text: VitalsText): { input: VitalsInput; errors: Partial<Record<keyof VitalsInput, string>> } {
  const input: VitalsInput = {};
  const errors: Partial<Record<keyof VitalsInput, string>> = {};
  for (const k of VITAL_KEYS) {
    const raw = text[k].trim();
    if (!raw) continue;
    const n = Number(raw);
    const r = VITAL_RANGES[k];
    if (Number.isNaN(n)) errors[k] = `${r.label} must be a number.`;
    else if (n < r.hardMin || n > r.hardMax) errors[k] = `${r.label} should be between ${r.hardMin} and ${r.hardMax} ${r.unit}.`;
    else input[k] = n;
  }
  return { input, errors };
}

export function VitalsForm({
  text,
  previous,
  onChange,
  onBlur,
}: {
  text: VitalsText;
  previous?: Vitals;
  onChange: (next: VitalsText) => void;
  onBlur: () => void;
}) {
  const { input, errors } = parseVitals(text);
  const bmi = computeBmi(input.heightCm, input.weightKg);
  const bmiFlag = bmi !== undefined && (bmi < 18.5 || bmi >= 25);

  function set(k: keyof VitalsInput, v: string) {
    onChange({ ...text, [k]: v.replace(/[^\d.]/g, "") });
  }

  return (
    <section id="section-vitals" data-section-key="vitals" className="scroll-mt-28 rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className={cn("size-2 rounded-full", Object.keys(input).length ? "bg-good" : "bg-border")} aria-hidden />
        <h3 className="text-sm font-semibold">Vitals</h3>
        {previous && <span className="text-xs text-muted-foreground">— previous visit shown in grey</span>}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pb-4 sm:grid-cols-3 lg:grid-cols-6">
        <Field className="col-span-2" label="BP" unit="mmHg" error={errors.bpSystolic ?? errors.bpDiastolic} prev={previous?.bpSystolic && previous?.bpDiastolic ? `${previous.bpSystolic}/${previous.bpDiastolic}` : undefined}>
          <div className="flex items-center gap-1">
            <VitalInput value={text.bpSystolic} onChange={(v) => set("bpSystolic", v)} onBlur={onBlur} flag={flagVital("bpSystolic", input.bpSystolic)} invalid={!!errors.bpSystolic} placeholder="120" />
            <span className="text-muted-foreground">/</span>
            <VitalInput value={text.bpDiastolic} onChange={(v) => set("bpDiastolic", v)} onBlur={onBlur} flag={flagVital("bpDiastolic", input.bpDiastolic)} invalid={!!errors.bpDiastolic} placeholder="80" />
          </div>
        </Field>

        {(["pulseBpm", "temperatureF", "respRate", "spo2Percent", "heightCm", "weightKg"] as const).map((k) => (
          <Field key={k} label={VITAL_RANGES[k].label} unit={VITAL_RANGES[k].unit} error={errors[k]} prev={previous?.[k] !== undefined ? String(previous[k]) : undefined}>
            <VitalInput value={text[k]} onChange={(v) => set(k, v)} onBlur={onBlur} flag={flagVital(k, input[k])} invalid={!!errors[k]} placeholder={String(Math.round((VITAL_RANGES[k].min + VITAL_RANGES[k].max) / 2))} />
          </Field>
        ))}

        <Field label="BMI" unit={bmiCategory(bmi) ?? "kg/m²"} prev={previous?.bmi !== undefined ? String(previous.bmi) : undefined}>
          <div className={cn("flex h-8 items-center px-1 font-mono text-sm tnum", bmi === undefined ? "text-muted-foreground" : bmiFlag ? "font-semibold text-warn" : "")}>{bmi ?? "—"}</div>
        </Field>
      </div>

      {Object.values(errors).length > 0 && (
        <ul className="border-t px-4 py-2 text-xs text-flag">
          {Object.values(errors).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Field({ label, unit, error, prev, className, children }: { label: string; unit: string; error?: string; prev?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
        <span className="truncate font-mono text-[10px] text-muted-foreground">{unit}</span>
      </div>
      <div aria-invalid={!!error}>{children}</div>
      {prev && <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/70 tnum">prev {prev}</div>}
    </div>
  );
}

function VitalInput({
  value,
  onChange,
  onBlur,
  flag,
  invalid,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  flag: "normal" | "low" | "high";
  invalid: boolean;
  placeholder: string;
}) {
  return (
    <Input
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      aria-invalid={invalid}
      className={cn("font-mono tnum", flag !== "normal" && !invalid && "border-warn/60 bg-warn-soft/60 font-semibold text-warn")}
    />
  );
}
