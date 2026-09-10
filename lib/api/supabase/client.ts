"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataClient } from "@/lib/api/types";
import type { CaseSection, Consultation, DashboardData, Doctor, Language, Patient, PatientListItem, SectionKey, SectionPatch, Vitals, VitalsInput } from "@/lib/types";
import { SECTION_ORDER } from "@/lib/types";
import { localCompleteness } from "@/lib/clinical";
import { supabaseBrowser } from "@/lib/supabase/browser";

// The Supabase implementation of DataClient. Calls go straight from the
// browser to Postgres; row-level security scopes everything to the signed-in
// doctor's clinic. Same method signatures as the mock — components can't tell.

// ---------- row shapes (snake_case, as stored) ----------

interface PatientRow {
  id: string;
  patient_code: string;
  full_name: string;
  age_years: number | null;
  gender: Patient["gender"] | null;
  phone: string | null;
  address: string | null;
  blood_group: string | null;
  abha_number: string | null;
  allergies: string[] | null;
  preferred_language: Language;
  consent_given: boolean;
  consent_at: string | null;
  created_at: string;
}

interface SectionRow {
  section_key: SectionKey;
  content: string;
  source: CaseSection["source"];
  ai_confidence: number | null;
  source_quote: string | null;
  carried_from: string | null;
  updated_at: string;
}

interface VitalsRow {
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse_bpm: number | null;
  temperature_f: number | null;
  resp_rate: number | null;
  spo2_percent: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  recorded_at: string;
}

interface ConsultationRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  visit_type: Consultation["visitType"];
  status: Consultation["status"];
  chief_complaint: string | null;
  language_used: Language;
  completeness_score: number;
  transcript: string | null;
  summary: string | null;
  started_at: string;
  signed_at: string | null;
  is_locked: boolean;
  case_sections?: SectionRow[];
  vitals?: VitalsRow | VitalsRow[] | null;
}

const CONSULTATION_SELECT = "*, case_sections(*), vitals(*)";

// ---------- mappers ----------

const num = (v: number | string | null | undefined) => (v === null || v === undefined ? undefined : Number(v));

function toPatient(r: PatientRow): Patient {
  return {
    id: r.id,
    patientCode: r.patient_code,
    fullName: r.full_name,
    ageYears: r.age_years ?? 0,
    gender: r.gender ?? "other",
    phone: r.phone ?? "",
    address: r.address ?? undefined,
    bloodGroup: r.blood_group ?? undefined,
    abhaNumber: r.abha_number ?? undefined,
    allergies: r.allergies ?? [],
    preferredLanguage: r.preferred_language,
    consentGiven: r.consent_given,
    consentAt: r.consent_at ?? undefined,
    createdAt: r.created_at,
  };
}

function toVitals(r: VitalsRow): Vitals {
  return {
    bpSystolic: num(r.bp_systolic),
    bpDiastolic: num(r.bp_diastolic),
    pulseBpm: num(r.pulse_bpm),
    temperatureF: num(r.temperature_f),
    respRate: num(r.resp_rate),
    spo2Percent: num(r.spo2_percent),
    heightCm: num(r.height_cm),
    weightKg: num(r.weight_kg),
    bmi: num(r.bmi),
    recordedAt: r.recorded_at,
  };
}

function toConsultation(r: ConsultationRow): Consultation {
  const byKey = new Map((r.case_sections ?? []).map((s) => [s.section_key, s]));
  const sections: CaseSection[] = SECTION_ORDER.map((key) => {
    const s = byKey.get(key);
    return s
      ? { key, content: s.content, source: s.source, aiConfidence: num(s.ai_confidence), sourceQuote: s.source_quote ?? undefined, carriedFrom: s.carried_from ?? undefined, updatedAt: s.updated_at }
      : { key, content: "", source: "doctor", updatedAt: r.started_at };
  });
  const v = Array.isArray(r.vitals) ? r.vitals[0] : r.vitals;
  return {
    id: r.id,
    patientId: r.patient_id,
    doctorId: r.doctor_id,
    visitType: r.visit_type,
    status: r.status,
    chiefComplaint: r.chief_complaint ?? undefined,
    languageUsed: r.language_used,
    completenessScore: r.completeness_score,
    transcript: r.transcript ?? undefined,
    summary: r.summary ?? undefined,
    startedAt: r.started_at,
    signedAt: r.signed_at ?? undefined,
    isLocked: r.is_locked,
    sections,
    vitals: v ? toVitals(v) : undefined,
  };
}

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

// ---------- doctor / clinic (cached per tab) ----------

let doctorCache: (Doctor & { clinicId: string }) | null = null;

async function currentDoctor(sb: SupabaseClient) {
  if (doctorCache) return doctorCache;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await sb.from("profiles").select("id, clinic_id, full_name, qualification, reg_number, clinics(name)").eq("id", user.id).single();
  if (error || !data) fail(error, "No doctor profile for this account. Run supabase/seed.sql or create a profiles row.");
  const clinic = (Array.isArray(data.clinics) ? data.clinics[0] : data.clinics) as { name: string } | null;
  doctorCache = {
    id: data.id,
    fullName: data.full_name,
    qualification: data.qualification ?? "",
    regNumber: data.reg_number ?? "",
    clinicName: clinic?.name ?? "Clinic",
    clinicId: data.clinic_id,
  };
  return doctorCache;
}

async function fetchConsultation(sb: SupabaseClient, id: string): Promise<Consultation> {
  const { data, error } = await sb.from("consultations").select(CONSULTATION_SELECT).eq("id", id).single();
  if (error || !data) fail(error, "Consultation not found");
  return toConsultation(data as ConsultationRow);
}

async function updateConsultation(sb: SupabaseClient, id: string, patch: Record<string, unknown>) {
  const { error } = await sb.from("consultations").update(patch).eq("id", id);
  if (error) fail(error, "Could not update the consultation");
}

// ---------- the client ----------

export const supabaseClient: DataClient = {
  async getCurrentDoctor() {
    const d = await currentDoctor(supabaseBrowser());
    return { id: d.id, fullName: d.fullName, qualification: d.qualification, regNumber: d.regNumber, clinicName: d.clinicName };
  },

  async listPatients(query) {
    const sb = supabaseBrowser();
    let q = sb.from("patients").select("*, consultations(started_at, status)");
    const term = (query ?? "").trim();
    if (term) {
      const like = `%${term.replace(/[%_]/g, "")}%`;
      q = q.or(`full_name.ilike.${like},phone.ilike.${like},patient_code.ilike.${like}`);
    }
    const { data, error } = await q.limit(200);
    if (error) fail(error, "Could not load patients");
    const items: PatientListItem[] = (data as Array<PatientRow & { consultations: Array<{ started_at: string; status: string }> }>).map((r) => {
      const visits = r.consultations ?? [];
      const last = visits.reduce<string | undefined>((m, c) => (!m || c.started_at > m ? c.started_at : m), undefined);
      return { ...toPatient(r), lastVisitAt: last, visitCount: visits.length, hasOpenDraft: visits.some((c) => c.status === "draft") };
    });
    items.sort((a, b) => (b.lastVisitAt ?? b.createdAt).localeCompare(a.lastVisitAt ?? a.createdAt));
    return items;
  },

  async getPatient(id) {
    const { data, error } = await supabaseBrowser().from("patients").select("*").eq("id", id).maybeSingle();
    if (error) fail(error, "Could not load the patient");
    return data ? toPatient(data as PatientRow) : null;
  },

  async createPatient(input) {
    const sb = supabaseBrowser();
    const d = await currentDoctor(sb);
    const { data, error } = await sb
      .from("patients")
      .insert({
        clinic_id: d.clinicId,
        full_name: input.fullName,
        age_years: input.ageYears,
        gender: input.gender,
        phone: input.phone,
        address: input.address ?? null,
        blood_group: input.bloodGroup ?? null,
        abha_number: input.abhaNumber ?? null,
        allergies: input.allergies,
        preferred_language: input.preferredLanguage,
        consent_given: input.consentGiven,
        consent_at: input.consentGiven ? new Date().toISOString() : null,
      })
      .select("*")
      .single();
    if (error || !data) fail(error, "Could not create the patient");
    return toPatient(data as PatientRow);
  },

  async updatePatient(id, patch) {
    const row: Record<string, unknown> = {};
    if (patch.fullName !== undefined) row.full_name = patch.fullName;
    if (patch.ageYears !== undefined) row.age_years = patch.ageYears;
    if (patch.gender !== undefined) row.gender = patch.gender;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.address !== undefined) row.address = patch.address;
    if (patch.bloodGroup !== undefined) row.blood_group = patch.bloodGroup;
    if (patch.abhaNumber !== undefined) row.abha_number = patch.abhaNumber;
    if (patch.allergies !== undefined) row.allergies = patch.allergies;
    if (patch.preferredLanguage !== undefined) row.preferred_language = patch.preferredLanguage;
    const { data, error } = await supabaseBrowser().from("patients").update(row).eq("id", id).select("*").single();
    if (error || !data) fail(error, "Could not update the patient");
    return toPatient(data as PatientRow);
  },

  async listConsultations(patientId) {
    const { data, error } = await supabaseBrowser().from("consultations").select(CONSULTATION_SELECT).eq("patient_id", patientId).order("started_at", { ascending: false });
    if (error) fail(error, "Could not load consultations");
    return (data as ConsultationRow[]).map(toConsultation);
  },

  async getConsultation(id) {
    const { data, error } = await supabaseBrowser().from("consultations").select(CONSULTATION_SELECT).eq("id", id).maybeSingle();
    if (error) fail(error, "Could not load the consultation");
    return data ? toConsultation(data as ConsultationRow) : null;
  },

  async startConsultation(patientId) {
    const sb = supabaseBrowser();
    const d = await currentDoctor(sb);
    const [patient, prior] = await Promise.all([this.getPatient(patientId), this.listConsultations(patientId)]);
    if (!patient) throw new Error("Patient not found");
    const lastSigned = prior.find((c) => c.status === "signed");

    const { data: created, error } = await sb
      .from("consultations")
      .insert({ clinic_id: d.clinicId, patient_id: patientId, doctor_id: d.id, visit_type: prior.length ? "follow-up" : "new", language_used: patient.preferredLanguage })
      .select("id")
      .single();
    if (error || !created) fail(error, "Could not start the consultation");

    // Carry-forward: history that rarely changes comes across from the last
    // signed note, marked so the doctor confirms rather than retypes.
    const rows = SECTION_ORDER.map((key) => {
      const src = lastSigned && (key === "past_history" || key === "medications") ? lastSigned.sections.find((s) => s.key === key) : undefined;
      return src?.content
        ? { consultation_id: created.id, section_key: key, content: src.content, source: "doctor", carried_from: lastSigned!.id }
        : { consultation_id: created.id, section_key: key, content: "", source: "doctor", carried_from: null };
    });
    const { error: secErr } = await sb.from("case_sections").insert(rows);
    if (secErr) fail(secErr, "Could not create the case sections");

    const c = await fetchConsultation(sb, created.id);
    await updateConsultation(sb, c.id, { completeness_score: localCompleteness(c) });
    return { ...c, completenessScore: localCompleteness(c) };
  },

  async saveSection(consultationId, key: SectionKey, patch: SectionPatch) {
    const sb = supabaseBrowser();
    const row: Record<string, unknown> = { consultation_id: consultationId, section_key: key, updated_at: new Date().toISOString() };
    if (patch.content !== undefined) row.content = patch.content;
    if (patch.source !== undefined) row.source = patch.source;
    if ("aiConfidence" in patch) row.ai_confidence = patch.aiConfidence ?? null;
    if ("sourceQuote" in patch) row.source_quote = patch.sourceQuote ?? null;
    if ("carriedFrom" in patch) row.carried_from = patch.carriedFrom ?? null;
    const { error } = await sb.from("case_sections").upsert(row, { onConflict: "consultation_id,section_key" });
    if (error) fail(error, "Could not save the section");

    const c = await fetchConsultation(sb, consultationId);
    const consultPatch: Record<string, unknown> = { completeness_score: localCompleteness(c) };
    if (key === "chief_complaint" && patch.content !== undefined) consultPatch.chief_complaint = patch.content.split("\n")[0].slice(0, 120);
    await updateConsultation(sb, consultationId, consultPatch);
    return { ...c, completenessScore: consultPatch.completeness_score as number, chiefComplaint: (consultPatch.chief_complaint as string | undefined) ?? c.chiefComplaint };
  },

  async saveVitals(consultationId, input: VitalsInput) {
    const sb = supabaseBrowser();
    const { data, error } = await sb
      .from("vitals")
      .upsert(
        {
          consultation_id: consultationId,
          bp_systolic: input.bpSystolic ?? null,
          bp_diastolic: input.bpDiastolic ?? null,
          pulse_bpm: input.pulseBpm ?? null,
          temperature_f: input.temperatureF ?? null,
          resp_rate: input.respRate ?? null,
          spo2_percent: input.spo2Percent ?? null,
          height_cm: input.heightCm ?? null,
          weight_kg: input.weightKg ?? null,
          recorded_at: new Date().toISOString(),
        },
        { onConflict: "consultation_id" },
      )
      .select("*")
      .single();
    if (error || !data) fail(error, "Could not save vitals");
    const c = await fetchConsultation(sb, consultationId);
    await updateConsultation(sb, consultationId, { completeness_score: localCompleteness(c) });
    return toVitals(data as VitalsRow);
  },

  async setTranscript(consultationId, transcript) {
    await updateConsultation(supabaseBrowser(), consultationId, { transcript });
  },
  async setLanguage(consultationId, language) {
    await updateConsultation(supabaseBrowser(), consultationId, { language_used: language });
  },
  async setSummary(consultationId, summary) {
    await updateConsultation(supabaseBrowser(), consultationId, { summary: summary || null });
  },
  async setCompleteness(consultationId, score) {
    await updateConsultation(supabaseBrowser(), consultationId, { completeness_score: Math.max(0, Math.min(100, Math.round(score))) });
  },

  async signConsultation(consultationId) {
    const sb = supabaseBrowser();
    await updateConsultation(sb, consultationId, { status: "signed", is_locked: true, signed_at: new Date().toISOString() });
    return fetchConsultation(sb, consultationId);
  },

  async getDashboard(): Promise<DashboardData> {
    const sb = supabaseBrowser();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [todayRes, recentRes, weekRes, draftsRes, signedRes] = await Promise.all([
      sb.from("consultations").select(`${CONSULTATION_SELECT}, patients(*)`).gte("started_at", startOfDay.toISOString()).order("started_at", { ascending: true }),
      sb.from("consultations").select(`${CONSULTATION_SELECT}, patients(*)`).order("started_at", { ascending: false }).limit(6),
      sb.from("consultations").select("id", { count: "exact", head: true }).gte("started_at", weekAgo),
      sb.from("consultations").select("id", { count: "exact", head: true }).eq("status", "draft"),
      sb.from("consultations").select("completeness_score").eq("status", "signed"),
    ]);
    for (const r of [todayRes, recentRes, weekRes, draftsRes, signedRes]) if (r.error) fail(r.error, "Could not load the dashboard");

    type Joined = ConsultationRow & { patients: PatientRow };
    const withPatient = (r: Joined) => ({ patient: toPatient(r.patients), consultation: toConsultation(r) });
    const today = (todayRes.data as Joined[]).map(withPatient);
    const signedScores = (signedRes.data as Array<{ completeness_score: number }>).map((x) => x.completeness_score);

    return {
      todaysQueue: today,
      recentConsultations: (recentRes.data as Joined[]).map(withPatient),
      stats: {
        patientsToday: new Set(today.map((t) => t.patient.id)).size,
        consultationsThisWeek: weekRes.count ?? 0,
        draftsPending: draftsRes.count ?? 0,
        avgCompleteness: signedScores.length ? Math.round(signedScores.reduce((a, b) => a + b, 0) / signedScores.length) : 0,
      },
    };
  },

  async resetDemoData() {
    // Real data is never reset from the UI. Re-run supabase/seed.sql instead.
    throw new Error("Reset is only available on demo data. Re-run supabase/seed.sql to restore the demo clinic.");
  },
};
