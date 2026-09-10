import type { Consultation, Doctor, Patient, SectionKey, SectionSource } from "@/lib/types";
import { withBmi } from "@/lib/clinical";

export interface MockDb {
  version: number;
  doctor: Doctor;
  patients: Patient[];
  consultations: Consultation[];
  counters: { patient: number };
}

const YEAR = new Date().getFullYear();

function daysAgo(n: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function sec(key: SectionKey, content: string, source: SectionSource = "doctor", at: string): Consultation["sections"][number] {
  return { key, content, source, updatedAt: at };
}

export const DOCTOR: Doctor = {
  id: "doc_anjali_rao",
  fullName: "Dr. Anjali Rao",
  qualification: "MBBS, MD (General Medicine)",
  regNumber: "KMC 48213",
  clinicName: "Shruti Demo Clinic",
};

function patient(
  n: number,
  p: Omit<Patient, "id" | "patientCode" | "createdAt" | "consentGiven" | "consentAt"> & { registeredDaysAgo: number },
): Patient {
  const { registeredDaysAgo, ...rest } = p;
  return {
    id: `pat_${String(n).padStart(3, "0")}`,
    patientCode: `SHR-${YEAR}-${String(140 + n).padStart(4, "0")}`,
    consentGiven: true,
    consentAt: daysAgo(registeredDaysAgo, 9, 15),
    createdAt: daysAgo(registeredDaysAgo, 9, 15),
    ...rest,
  };
}

export function buildSeed(): MockDb {
  const patients: Patient[] = [
    patient(1, {
      fullName: "Sunita Devi",
      ageYears: 46,
      gender: "female",
      phone: "98450 12345",
      address: "Jayanagar 4th Block, Bengaluru",
      bloodGroup: "B+",
      abhaNumber: "91-2345-6789-0123",
      allergies: [],
      preferredLanguage: "hi",
      registeredDaysAgo: 120,
    }),
    patient(2, {
      fullName: "Ramesh Kumar",
      ageYears: 52,
      gender: "male",
      phone: "99000 23456",
      address: "BTM Layout, Bengaluru",
      bloodGroup: "O+",
      allergies: [],
      preferredLanguage: "hi",
      registeredDaysAgo: 400,
    }),
    patient(3, {
      fullName: "Priya Nair",
      ageYears: 29,
      gender: "female",
      phone: "98860 34567",
      address: "Koramangala, Bengaluru",
      bloodGroup: "A+",
      allergies: [],
      preferredLanguage: "en",
      registeredDaysAgo: 30,
    }),
    patient(4, {
      fullName: "Mohammed Irfan",
      ageYears: 34,
      gender: "male",
      phone: "97410 45678",
      address: "Shivajinagar, Bengaluru",
      bloodGroup: "AB+",
      allergies: ["Penicillin — urticaria", "Sulpha drugs"],
      preferredLanguage: "hi",
      registeredDaysAgo: 60,
    }),
    patient(5, {
      fullName: "Lakshmi Iyer",
      ageYears: 61,
      gender: "female",
      phone: "98440 56789",
      address: "Malleshwaram, Bengaluru",
      bloodGroup: "O-",
      allergies: [],
      preferredLanguage: "ta",
      registeredDaysAgo: 200,
    }),
    patient(6, {
      fullName: "Arjun Patil",
      ageYears: 8,
      gender: "male",
      phone: "98220 67890",
      address: "Rajajinagar, Bengaluru",
      bloodGroup: "B+",
      allergies: ["Peanuts"],
      preferredLanguage: "mr",
      registeredDaysAgo: 14,
    }),
    patient(7, {
      fullName: "Fatima Begum",
      ageYears: 38,
      gender: "female",
      phone: "98310 78901",
      address: "Frazer Town, Bengaluru",
      bloodGroup: "A-",
      allergies: [],
      preferredLanguage: "bn",
      registeredDaysAgo: 5,
    }),
    patient(8, {
      fullName: "Venkatesh Reddy",
      ageYears: 45,
      gender: "male",
      phone: "99490 89012",
      address: "HSR Layout, Bengaluru",
      bloodGroup: "O+",
      allergies: [],
      preferredLanguage: "te",
      registeredDaysAgo: 90,
    }),
  ];

  const consultations: Consultation[] = [];

  // ---- Sunita Devi: two signed visits (the demo patient) ----
  {
    const t1 = daysAgo(95, 10, 20);
    consultations.push({
      id: "con_001",
      patientId: "pat_001",
      doctorId: DOCTOR.id,
      visitType: "new",
      status: "signed",
      chiefComplaint: "Headache and giddiness for 2 weeks",
      languageUsed: "hi",
      completenessScore: 88,
      startedAt: t1,
      signedAt: daysAgo(95, 10, 41),
      isLocked: true,
      sections: [
        sec("chief_complaint", "Headache and giddiness for 2 weeks, worse in the mornings.", "doctor", t1),
        sec("hpi", "Dull occipital headache most mornings for two weeks. Occasional giddiness on standing. No visual disturbance, no vomiting. Sleep reduced due to work stress.", "ai_accepted", t1),
        sec("past_history", "No known diabetes. No prior hospitalisation. Mother has hypertension.", "ai_accepted", t1),
        sec("medications", "Not on any regular medication. No known drug allergies.", "doctor", t1),
        sec("examination", "Alert, oriented. No pallor. CVS: S1 S2 normal, no murmur. RS: clear. Fundus not examined.", "ai_edited", t1),
        sec("plan", "Provisional: Essential hypertension, newly detected. Advised salt restriction, 30 min daily walk. Investigations: FBS, lipid profile, RFT, ECG. Review in 2 weeks with reports.", "doctor", t1),
      ],
      vitals: withBmi({ bpSystolic: 156, bpDiastolic: 98, pulseBpm: 84, temperatureF: 98.2, respRate: 16, spo2Percent: 98, heightCm: 158, weightKg: 71 }, t1),
      summary:
        "PRESENTING COMPLAINT\nHeadache and giddiness for two weeks, worse in the mornings.\n\nHISTORY\nNo known diabetes or prior hospitalisation. Family history of hypertension (mother). Not on regular medication; no known drug allergies.\n\nEXAMINATION\nBP 156/98 mmHg, pulse 84 bpm, SpO₂ 98%, BMI 28.4. Cardiovascular and respiratory examination unremarkable.\n\nASSESSMENT AS DOCUMENTED\nDocumented provisional diagnosis: newly detected essential hypertension.\n\nPLAN\nSalt restriction and daily walking advised. FBS, lipid profile, RFT and ECG ordered. Review in two weeks with reports.",
    });

    const t2 = daysAgo(80, 11, 5);
    consultations.push({
      id: "con_002",
      patientId: "pat_001",
      doctorId: DOCTOR.id,
      visitType: "follow-up",
      status: "signed",
      chiefComplaint: "Follow-up with reports — hypertension",
      languageUsed: "hi",
      completenessScore: 92,
      startedAt: t2,
      signedAt: daysAgo(80, 11, 22),
      isLocked: true,
      sections: [
        sec("chief_complaint", "Follow-up for hypertension with investigation reports.", "doctor", t2),
        sec("hpi", "Headaches reduced with lifestyle changes. No giddiness this week. Reports: FBS 104 mg/dL, total cholesterol 218 mg/dL, creatinine 0.9 mg/dL, ECG within normal limits.", "ai_accepted", t2),
        sec("past_history", "Newly detected hypertension (previous visit). Mother has hypertension.", "doctor", t2),
        sec("medications", "Started Tab. Amlodipine 5 mg once daily at night. No known drug allergies.", "doctor", t2),
        sec("examination", "BP 148/92 mmHg on repeat. CVS and RS normal.", "ai_accepted", t2),
        sec("plan", "Diagnosis: Essential hypertension, Stage 1. Continue Amlodipine 5 mg OD. Home BP monitoring twice daily. Review in 4 weeks.", "doctor", t2),
      ],
      vitals: withBmi({ bpSystolic: 148, bpDiastolic: 92, pulseBpm: 78, temperatureF: 98.4, respRate: 16, spo2Percent: 98, heightCm: 158, weightKg: 70 }, t2),
      summary:
        "PRESENTING COMPLAINT\nFollow-up for hypertension with investigation reports.\n\nHISTORY\nHeadaches reduced with lifestyle changes; no giddiness this week. FBS 104 mg/dL, total cholesterol 218 mg/dL, creatinine 0.9 mg/dL, ECG within normal limits. Started Amlodipine 5 mg at night.\n\nEXAMINATION\nBP 148/92 mmHg, pulse 78 bpm, BMI 28.0. Cardiovascular and respiratory examination normal.\n\nASSESSMENT AS DOCUMENTED\nDocumented diagnosis: essential hypertension, Stage 1.\n\nPLAN\nContinue Amlodipine 5 mg once daily. Home BP monitoring twice daily. Review in four weeks.",
    });
  }

  // ---- Ramesh Kumar: three signed visits (diabetes) ----
  {
    const visits: Array<{ id: string; ago: number; type: "new" | "follow-up"; cc: string; hpi: string; plan: string; bp: [number, number]; wt: number }> = [
      { id: "con_003", ago: 180, type: "new", cc: "Increased thirst and frequent urination for 1 month", hpi: "Polyuria and polydipsia for one month, 3 kg weight loss. No fever. RBS at pharmacy 268 mg/dL.", plan: "Provisional: Type 2 diabetes mellitus. Ordered FBS, PPBS, HbA1c, lipid profile, RFT, urine routine. Diet counselling given. Review in 1 week.", bp: [132, 84], wt: 78 },
      { id: "con_004", ago: 172, type: "follow-up", cc: "Diabetes — review with reports", hpi: "HbA1c 8.9%, FBS 186, PPBS 262. Symptoms unchanged.", plan: "Diagnosis: Type 2 DM. Started Tab. Metformin 500 mg BD after food. Diet and 30 min walk daily. Review in 6 weeks.", bp: [130, 82], wt: 77 },
      { id: "con_005", ago: 45, type: "follow-up", cc: "Diabetes follow-up", hpi: "Symptoms resolved. HbA1c 7.2%. Tolerating Metformin, mild bloating initially, now settled.", plan: "Good control. Continue Metformin 500 mg BD. Annual eye and foot check advised. Review in 3 months with HbA1c.", bp: [128, 80], wt: 75 },
    ];
    for (const v of visits) {
      const t = daysAgo(v.ago, 9, 40);
      consultations.push({
        id: v.id,
        patientId: "pat_002",
        doctorId: DOCTOR.id,
        visitType: v.type,
        status: "signed",
        chiefComplaint: v.cc,
        languageUsed: "hi",
        completenessScore: 90,
        startedAt: t,
        signedAt: daysAgo(v.ago, 9, 58),
        isLocked: true,
        sections: [
          sec("chief_complaint", v.cc + ".", "doctor", t),
          sec("hpi", v.hpi, "ai_accepted", t),
          sec("past_history", "No prior chronic illness before this. Father had diabetes.", "doctor", t),
          sec("medications", v.type === "new" ? "None. No known drug allergies." : "Tab. Metformin 500 mg BD. No known drug allergies.", "doctor", t),
          sec("examination", "No pallor, no pedal oedema. CVS and RS normal. Foot examination: sensation intact.", "ai_accepted", t),
          sec("plan", v.plan, "doctor", t),
        ],
        vitals: withBmi({ bpSystolic: v.bp[0], bpDiastolic: v.bp[1], pulseBpm: 76, temperatureF: 98.4, respRate: 15, spo2Percent: 98, heightCm: 170, weightKg: v.wt }, t),
        summary: `PRESENTING COMPLAINT\n${v.cc}.\n\nHISTORY\n${v.hpi}\n\nEXAMINATION\nBP ${v.bp[0]}/${v.bp[1]} mmHg. Cardiovascular and respiratory examination normal. Foot sensation intact.\n\nPLAN\n${v.plan}`,
      });
    }
  }

  // ---- Mohammed Irfan: one signed visit (the allergy patient) ----
  {
    const t = daysAgo(40, 16, 10);
    consultations.push({
      id: "con_006",
      patientId: "pat_004",
      doctorId: DOCTOR.id,
      visitType: "new",
      status: "signed",
      chiefComplaint: "Sore throat and fever for 3 days",
      languageUsed: "hi",
      completenessScore: 85,
      startedAt: t,
      signedAt: daysAgo(40, 16, 24),
      isLocked: true,
      sections: [
        sec("chief_complaint", "Sore throat and fever for 3 days.", "doctor", t),
        sec("hpi", "Fever up to 101°F with sore throat and painful swallowing for three days. No cough. No breathlessness.", "ai_accepted", t),
        sec("past_history", "No chronic illness.", "doctor", t),
        sec("medications", "ALLERGY: Penicillin (urticaria), sulpha drugs. Not on regular medication.", "doctor", t),
        sec("examination", "Temp 100.8°F. Throat: congested, tonsils enlarged with exudate. Tender anterior cervical nodes. Chest clear.", "ai_edited", t),
        sec("plan", "Provisional: Acute tonsillitis. Penicillin allergy noted — prescribed Tab. Azithromycin 500 mg OD × 3 days, Tab. Paracetamol 650 mg SOS. Warm saline gargles. Review if no improvement in 3 days.", "doctor", t),
      ],
      vitals: withBmi({ bpSystolic: 118, bpDiastolic: 76, pulseBpm: 92, temperatureF: 100.8, respRate: 18, spo2Percent: 98, heightCm: 172, weightKg: 68 }, t),
      summary:
        "PRESENTING COMPLAINT\nSore throat and fever for three days.\n\nHISTORY\nNo chronic illness. Documented allergy to penicillin (urticaria) and sulpha drugs.\n\nEXAMINATION\nTemperature 100.8°F, pulse 92 bpm. Congested throat with tonsillar exudate and tender cervical nodes. Chest clear.\n\nASSESSMENT AS DOCUMENTED\nDocumented provisional diagnosis: acute tonsillitis.\n\nPLAN\nAzithromycin 500 mg once daily for three days (penicillin avoided), Paracetamol as needed, warm saline gargles. Review if no improvement in three days.",
    });
  }

  // ---- Two drafts started today so the dashboard queue is populated ----
  {
    const t = daysAgo(0, 9, 5);
    consultations.push({
      id: "con_007",
      patientId: "pat_005",
      doctorId: DOCTOR.id,
      visitType: "new",
      status: "draft",
      chiefComplaint: "Knee pain for 2 months",
      languageUsed: "ta",
      completenessScore: 29,
      startedAt: t,
      isLocked: false,
      sections: [
        sec("chief_complaint", "Pain in both knees for two months, worse on climbing stairs.", "doctor", t),
        sec("hpi", "", "doctor", t),
        sec("past_history", "", "doctor", t),
        sec("medications", "", "doctor", t),
        sec("examination", "", "doctor", t),
        sec("plan", "", "doctor", t),
      ],
      vitals: withBmi({ bpSystolic: 134, bpDiastolic: 86, pulseBpm: 80, temperatureF: 98.1, heightCm: 152, weightKg: 74 }, t),
    });

    const t2 = daysAgo(0, 9, 40);
    consultations.push({
      id: "con_008",
      patientId: "pat_006",
      doctorId: DOCTOR.id,
      visitType: "follow-up",
      status: "draft",
      chiefComplaint: "Cough and cold",
      languageUsed: "mr",
      completenessScore: 14,
      startedAt: t2,
      isLocked: false,
      sections: [
        sec("chief_complaint", "Cough and running nose for 4 days.", "doctor", t2),
        sec("hpi", "", "doctor", t2),
        sec("past_history", "", "doctor", t2),
        sec("medications", "", "doctor", t2),
        sec("examination", "", "doctor", t2),
        sec("plan", "", "doctor", t2),
      ],
    });
  }

  return {
    version: 1,
    doctor: DOCTOR,
    patients,
    consultations,
    counters: { patient: 148 },
  };
}
