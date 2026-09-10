// Small clinical helpers shared by the UI and the data layer.
// Reference ranges are adult OPD defaults; a clinic can override later.

import type { Vitals, VitalsInput, Consultation, CaseSection, SectionKey } from "./types";
import { SECTION_ORDER } from "./types";

export function computeBmi(heightCm?: number, weightKg?: number): number | undefined {
  if (!heightCm || !weightKg || heightCm <= 0) return undefined;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiCategory(bmi?: number): string | undefined {
  if (bmi === undefined) return undefined;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export type RangeFlag = "normal" | "low" | "high";

export const VITAL_RANGES: Record<
  keyof VitalsInput,
  { min: number; max: number; hardMin: number; hardMax: number; unit: string; label: string }
> = {
  bpSystolic: { min: 90, max: 139, hardMin: 50, hardMax: 260, unit: "mmHg", label: "Systolic" },
  bpDiastolic: { min: 60, max: 89, hardMin: 30, hardMax: 160, unit: "mmHg", label: "Diastolic" },
  pulseBpm: { min: 60, max: 100, hardMin: 30, hardMax: 220, unit: "bpm", label: "Pulse" },
  temperatureF: { min: 97, max: 99.5, hardMin: 93, hardMax: 108, unit: "°F", label: "Temperature" },
  respRate: { min: 12, max: 20, hardMin: 6, hardMax: 60, unit: "/min", label: "Resp. rate" },
  spo2Percent: { min: 95, max: 100, hardMin: 50, hardMax: 100, unit: "%", label: "SpO₂" },
  heightCm: { min: 100, max: 220, hardMin: 40, hardMax: 250, unit: "cm", label: "Height" },
  weightKg: { min: 30, max: 120, hardMin: 2, hardMax: 300, unit: "kg", label: "Weight" },
};

export function flagVital(key: keyof VitalsInput, value?: number): RangeFlag {
  if (value === undefined || Number.isNaN(value)) return "normal";
  const r = VITAL_RANGES[key];
  if (value < r.min) return "low";
  if (value > r.max) return "high";
  return "normal";
}

export function withBmi(input: VitalsInput, recordedAt = new Date().toISOString()): Vitals {
  return { ...input, bmi: computeBmi(input.heightCm, input.weightKg), recordedAt };
}

export function emptySections(now = new Date().toISOString()): CaseSection[] {
  return SECTION_ORDER.map((key) => ({ key, content: "", source: "doctor", updatedAt: now }));
}

export function getSection(c: Consultation, key: SectionKey): CaseSection | undefined {
  return c.sections.find((s) => s.key === key);
}

// Cheap completeness heuristic used until the AI gap-check replaces it.
export function localCompleteness(c: Consultation): number {
  const filled = c.sections.filter((s) => s.content.trim().length > 0).length;
  const vitalsFilled = c.vitals && Object.values(c.vitals).some((v) => typeof v === "number");
  const total = SECTION_ORDER.length + 1;
  return Math.round(((filled + (vitalsFilled ? 1 : 0)) / total) * 100);
}
