import { z } from "zod";

// Request bodies for /api/ai/* and the shapes the model must return.
// Output schemas are used with structured outputs, so every field is present
// and nullable rather than optional.

const Language = z.enum(["hi", "mr", "ta", "te", "bn", "en"]);
const SectionKey = z.enum(["chief_complaint", "hpi", "past_history", "medications", "examination", "plan"]);
const PatientCtx = z.object({ ageYears: z.number(), gender: z.enum(["male", "female", "other"]), allergies: z.array(z.string()) });
const Sections = z.object({
  chief_complaint: z.string(),
  hpi: z.string(),
  past_history: z.string(),
  medications: z.string(),
  examination: z.string(),
  plan: z.string(),
});
const VitalsCtx = z
  .object({
    bpSystolic: z.number().optional(),
    bpDiastolic: z.number().optional(),
    pulseBpm: z.number().optional(),
    temperatureF: z.number().optional(),
    respRate: z.number().optional(),
    spo2Percent: z.number().optional(),
    heightCm: z.number().optional(),
    weightKg: z.number().optional(),
    bmi: z.number().optional(),
  })
  .optional();

// ---- requests ----
export const StructureRequest = z.object({
  transcript: z.string().min(1).max(20_000),
  language: Language,
  patient: PatientCtx,
  consultationId: z.string().optional(),
});

export const GapsRequest = z.object({
  patient: PatientCtx,
  sections: Sections,
  vitals: VitalsCtx,
  consultationId: z.string().optional(),
});

export const SummaryRequest = GapsRequest.extend({
  patientName: z.string(),
  date: z.string(),
  doctorLine: z.string(),
});

// ---- model outputs ----
const OutSection = z.object({
  text: z.string(),
  source_quote: z.string(),
  confidence: z.number().min(0).max(1),
});

export const StructureOutput = z.object({
  chief_complaint: OutSection.nullable(),
  hpi: OutSection.nullable(),
  past_history: OutSection.nullable(),
  medications: OutSection.nullable(),
  examination: OutSection.nullable(),
  plan: OutSection.nullable(),
  unclear: z.array(z.string()),
  detected_language: z.enum(["hi", "mr", "ta", "te", "bn", "en", "mixed"]),
});
export type StructureOutput = z.infer<typeof StructureOutput>;

export const GapsOutput = z.object({
  completeness_score: z.number().int().min(0).max(100),
  gaps: z.array(
    z.object({
      section: z.union([SectionKey, z.literal("vitals")]),
      observation: z.string(),
      severity: z.enum(["high", "medium", "low"]),
      why: z.string(),
    }),
  ),
  strengths: z.array(z.string()),
});
export type GapsOutput = z.infer<typeof GapsOutput>;
