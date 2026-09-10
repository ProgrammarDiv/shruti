import type { Gender, Language, SectionKey, VitalsInput } from "@/lib/types";

// ---- structure: transcript → case-sheet sections ----

export interface StructuredSection {
  text: string; // clinical English
  sourceQuote: string; // verbatim from the transcript, original language
  confidence: number; // 0–1; below 0.6 means "only partly supported"
}

export interface StructureInput {
  transcript: string;
  language: Language;
  patient: { ageYears: number; gender: Gender; allergies: string[] };
}

export interface StructuredCase {
  sections: Partial<Record<SectionKey, StructuredSection>>;
  unclear: string[]; // things the model heard but would not commit to
  detectedLanguage: Language | "mixed";
  model: string;
  latencyMs: number;
}

// ---- gaps: what a complete record would normally include, but doesn't ----

export type GapSeverity = "high" | "medium" | "low";

export interface Gap {
  section: SectionKey | "vitals";
  observation: string; // documentation language — never clinical advice
  severity: GapSeverity;
  why: string; // the already-recorded content that triggered it
}

export interface CaseSheetInput {
  patient: { ageYears: number; gender: Gender; allergies: string[] };
  sections: Record<SectionKey, string>;
  vitals?: VitalsInput & { bmi?: number };
}

export interface GapReport {
  completenessScore: number; // 0–100
  gaps: Gap[]; // max 5, most important first
  strengths: string[];
  model: string;
  checkedAt: string;
}

// ---- summary ----

export interface SummaryInput extends CaseSheetInput {
  patientName: string;
  date: string;
  doctorLine: string;
}

export interface AiClient {
  readonly name: string;
  structure(input: StructureInput): Promise<StructuredCase>;
  detectGaps(input: CaseSheetInput): Promise<GapReport>;
  // Streams the summary token-by-token; resolves with the full text.
  summarize(input: SummaryInput, onToken?: (chunk: string) => void): Promise<string>;
}
