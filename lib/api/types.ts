import type {
  Consultation,
  DashboardData,
  Doctor,
  NewPatient,
  Patient,
  PatientListItem,
  SectionKey,
  SectionPatch,
  Vitals,
  VitalsInput,
} from "@/lib/types";

// The single data contract the UI depends on. The mock implementation backs
// this with localStorage; the Supabase implementation will back it with
// Postgres. Components must never import anything below this interface.
export interface DataClient {
  // identity
  getCurrentDoctor(): Promise<Doctor>;

  // patients
  listPatients(query?: string): Promise<PatientListItem[]>;
  getPatient(id: string): Promise<Patient | null>;
  createPatient(input: NewPatient): Promise<Patient>;
  updatePatient(id: string, patch: Partial<NewPatient>): Promise<Patient>;

  // consultations
  listConsultations(patientId: string): Promise<Consultation[]>;
  getConsultation(id: string): Promise<Consultation | null>;
  startConsultation(patientId: string): Promise<Consultation>;
  saveSection(consultationId: string, key: SectionKey, patch: SectionPatch): Promise<Consultation>;
  saveVitals(consultationId: string, vitals: VitalsInput): Promise<Vitals>;
  setTranscript(consultationId: string, transcript: string): Promise<void>;
  setSummary(consultationId: string, summary: string): Promise<void>;
  setCompleteness(consultationId: string, score: number): Promise<void>;
  signConsultation(consultationId: string): Promise<Consultation>;

  // dashboard
  getDashboard(): Promise<DashboardData>;

  // demo controls — no-ops on a real backend
  resetDemoData(): Promise<void>;
}
