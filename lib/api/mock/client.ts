import type { DataClient } from "@/lib/api/types";
import type { Consultation, DashboardData, Patient, PatientListItem, SectionKey, SectionPatch, Vitals, VitalsInput } from "@/lib/types";
import { emptySections, localCompleteness, withBmi } from "@/lib/clinical";
import { buildSeed, type MockDb } from "./seed";

const STORAGE_KEY = "shruti.db.v1";
const LATENCY_MS = 120; // small, so loading states are real and the Supabase swap won't surprise anyone

let memory: MockDb | null = null;

function load(): MockDb {
  if (memory) return memory;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MockDb;
        if (parsed.version === 1) {
          memory = parsed;
          return memory;
        }
      }
    } catch {
      // corrupt or blocked storage — fall through to a fresh seed
    }
  }
  memory = buildSeed();
  persist();
  return memory;
}

function persist() {
  if (!memory || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // storage full or blocked — keep working in memory
  }
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function newId(prefix: string): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

function requireConsultation(db: MockDb, id: string): Consultation {
  const c = db.consultations.find((x) => x.id === id);
  if (!c) throw new Error("Consultation not found");
  return c;
}

function requireEditable(db: MockDb, id: string): Consultation {
  const c = requireConsultation(db, id);
  if (c.isLocked) throw new Error("This consultation has been signed and cannot be edited. Add an addendum instead.");
  return c;
}

function sameDay(iso: string, ref = new Date()): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

export const mockClient: DataClient = {
  async getCurrentDoctor() {
    return delay(clone(load().doctor));
  },

  async listPatients(query) {
    const db = load();
    const q = (query ?? "").trim().toLowerCase().replace(/\s+/g, "");
    let list = db.patients;
    if (q) {
      list = list.filter((p) => {
        const name = p.fullName.toLowerCase().replace(/\s+/g, "");
        const phone = p.phone.replace(/\s+/g, "");
        const code = p.patientCode.toLowerCase();
        return name.includes(q) || phone.includes(q) || code.includes(q);
      });
    }
    const items: PatientListItem[] = list.map((p) => {
      const visits = db.consultations.filter((c) => c.patientId === p.id);
      const last = visits.reduce<string | undefined>((m, c) => (!m || c.startedAt > m ? c.startedAt : m), undefined);
      return { ...p, lastVisitAt: last, visitCount: visits.length, hasOpenDraft: visits.some((c) => c.status === "draft") };
    });
    // most recently seen first
    items.sort((a, b) => (b.lastVisitAt ?? b.createdAt).localeCompare(a.lastVisitAt ?? a.createdAt));
    return delay(clone(items));
  },

  async getPatient(id) {
    const p = load().patients.find((x) => x.id === id) ?? null;
    return delay(p ? clone(p) : null);
  },

  async createPatient(input) {
    const db = load();
    db.counters.patient += 1;
    const now = new Date().toISOString();
    const patient: Patient = {
      ...input,
      id: newId("pat"),
      patientCode: `SHR-${new Date().getFullYear()}-${String(db.counters.patient).padStart(4, "0")}`,
      consentAt: input.consentGiven ? now : undefined,
      createdAt: now,
    };
    db.patients.push(patient);
    persist();
    return delay(clone(patient));
  },

  async updatePatient(id, patch) {
    const db = load();
    const p = db.patients.find((x) => x.id === id);
    if (!p) throw new Error("Patient not found");
    Object.assign(p, patch);
    persist();
    return delay(clone(p));
  },

  async listConsultations(patientId) {
    const list = load()
      .consultations.filter((c) => c.patientId === patientId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return delay(clone(list));
  },

  async getConsultation(id) {
    const c = load().consultations.find((x) => x.id === id) ?? null;
    return delay(c ? clone(c) : null);
  },

  async startConsultation(patientId) {
    const db = load();
    const patient = db.patients.find((x) => x.id === patientId);
    if (!patient) throw new Error("Patient not found");
    const prior = db.consultations.filter((c) => c.patientId === patientId);
    const now = new Date().toISOString();
    const c: Consultation = {
      id: newId("con"),
      patientId,
      doctorId: db.doctor.id,
      visitType: prior.length ? "follow-up" : "new",
      status: "draft",
      languageUsed: patient.preferredLanguage,
      completenessScore: 0,
      startedAt: now,
      isLocked: false,
      sections: emptySections(now),
    };
    db.consultations.push(c);
    persist();
    return delay(clone(c));
  },

  async saveSection(consultationId, key: SectionKey, patch: SectionPatch) {
    const db = load();
    const c = requireEditable(db, consultationId);
    const s = c.sections.find((x) => x.key === key);
    if (!s) throw new Error("Unknown section");
    Object.assign(s, patch, { updatedAt: new Date().toISOString() });
    if (key === "chief_complaint" && patch.content !== undefined) c.chiefComplaint = patch.content.split("\n")[0].slice(0, 120);
    c.completenessScore = localCompleteness(c);
    persist();
    return delay(clone(c));
  },

  async saveVitals(consultationId, input: VitalsInput) {
    const db = load();
    const c = requireEditable(db, consultationId);
    const v: Vitals = withBmi(input);
    c.vitals = v;
    c.completenessScore = localCompleteness(c);
    persist();
    return delay(clone(v));
  },

  async setTranscript(consultationId, transcript) {
    const db = load();
    requireEditable(db, consultationId).transcript = transcript;
    persist();
    return delay(undefined);
  },

  async setSummary(consultationId, summary) {
    const db = load();
    requireEditable(db, consultationId).summary = summary;
    persist();
    return delay(undefined);
  },

  async setCompleteness(consultationId, score) {
    const db = load();
    requireEditable(db, consultationId).completenessScore = Math.max(0, Math.min(100, Math.round(score)));
    persist();
    return delay(undefined);
  },

  async signConsultation(consultationId) {
    const db = load();
    const c = requireEditable(db, consultationId);
    c.status = "signed";
    c.isLocked = true;
    c.signedAt = new Date().toISOString();
    persist();
    return delay(clone(c));
  },

  async getDashboard(): Promise<DashboardData> {
    const db = load();
    const byId = new Map(db.patients.map((p) => [p.id, p]));
    const withPatient = (c: Consultation) => ({ patient: byId.get(c.patientId)!, consultation: c });

    const today = db.consultations.filter((c) => sameDay(c.startedAt)).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const recent = [...db.consultations].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 6);

    const weekAgo = Date.now() - 7 * 86_400_000;
    const thisWeek = db.consultations.filter((c) => new Date(c.startedAt).getTime() >= weekAgo);
    const signed = db.consultations.filter((c) => c.status === "signed");
    const avg = signed.length ? Math.round(signed.reduce((s, c) => s + c.completenessScore, 0) / signed.length) : 0;

    return delay(
      clone({
        todaysQueue: today.map(withPatient),
        recentConsultations: recent.map(withPatient),
        stats: {
          patientsToday: new Set(today.map((c) => c.patientId)).size,
          consultationsThisWeek: thisWeek.length,
          draftsPending: db.consultations.filter((c) => c.status === "draft").length,
          avgCompleteness: avg,
        },
      }),
    );
  },

  async resetDemoData() {
    memory = buildSeed();
    persist();
    return delay(undefined);
  },
};
