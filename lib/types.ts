// Domain types for Shruti. These are the contract between the UI and
// whichever data backend is plugged into lib/api — mock today, Supabase later.
// Changing a type here is a schema change; treat it that way.

export type Language = "hi" | "mr" | "ta" | "te" | "bn" | "en";
export type Gender = "male" | "female" | "other";

export const LANGUAGE_LABELS: Record<Language, string> = {
  hi: "हिन्दी · Hindi",
  mr: "मराठी · Marathi",
  ta: "தமிழ் · Tamil",
  te: "తెలుగు · Telugu",
  bn: "বাংলা · Bengali",
  en: "English",
};

export interface Doctor {
  id: string;
  fullName: string;
  qualification: string;
  regNumber: string;
  clinicName: string;
}

export interface Patient {
  id: string;
  patientCode: string; // SHR-2026-0142
  fullName: string;
  ageYears: number;
  gender: Gender;
  phone: string;
  address?: string;
  bloodGroup?: string;
  abhaNumber?: string;
  allergies: string[];
  preferredLanguage: Language;
  consentGiven: boolean;
  consentAt?: string;
  createdAt: string;
}

export type NewPatient = Omit<Patient, "id" | "patientCode" | "createdAt" | "consentAt">;

// What the patient list renders — a patient plus the bits of visit history
// the table needs, so it doesn't fetch consultations per row.
export interface PatientListItem extends Patient {
  lastVisitAt?: string;
  visitCount: number;
  hasOpenDraft: boolean;
}

export type SectionKey =
  | "chief_complaint"
  | "hpi"
  | "past_history"
  | "medications"
  | "examination"
  | "plan";

export const SECTION_ORDER: SectionKey[] = [
  "chief_complaint",
  "hpi",
  "past_history",
  "medications",
  "examination",
  "plan",
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  chief_complaint: "Chief complaint",
  hpi: "History of present illness",
  past_history: "Past history",
  medications: "Medications & allergies",
  examination: "Examination",
  plan: "Assessment & plan",
};

// Who wrote a section. Drives the provenance badge — the feature that answers
// "how do we know the AI didn't make this up?"
export type SectionSource = "doctor" | "ai_draft" | "ai_accepted" | "ai_edited";

export interface CaseSection {
  key: SectionKey;
  content: string;
  source: SectionSource;
  aiConfidence?: number;
  sourceQuote?: string;
  carriedFrom?: string; // consultation id this text was copied from, until the doctor edits it
  updatedAt: string;
}

export type SectionPatch = Partial<Pick<CaseSection, "content" | "source" | "aiConfidence" | "sourceQuote" | "carriedFrom">>;

export interface Vitals {
  bpSystolic?: number;
  bpDiastolic?: number;
  pulseBpm?: number;
  temperatureF?: number;
  respRate?: number;
  spo2Percent?: number;
  heightCm?: number;
  weightKg?: number;
  bmi?: number; // computed, never entered
  recordedAt: string;
}

export type VitalsInput = Omit<Vitals, "bmi" | "recordedAt">;

export type ConsultationStatus = "draft" | "signed";

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  visitType: "new" | "follow-up";
  status: ConsultationStatus;
  chiefComplaint?: string;
  languageUsed: Language;
  completenessScore: number;
  startedAt: string;
  signedAt?: string;
  isLocked: boolean;
  sections: CaseSection[];
  vitals?: Vitals;
  transcript?: string;
  summary?: string;
}

export interface DashboardData {
  todaysQueue: Array<{ patient: Patient; consultation: Consultation }>;
  recentConsultations: Array<{ patient: Patient; consultation: Consultation }>;
  stats: {
    patientsToday: number;
    consultationsThisWeek: number;
    draftsPending: number;
    avgCompleteness: number;
  };
}
