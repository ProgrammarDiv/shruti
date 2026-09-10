import type { AiClient, CaseSheetInput, Gap, GapReport, StructureInput, StructuredCase, SummaryInput } from "@/lib/ai/types";
import type { SectionKey } from "@/lib/types";
import { SECTION_LABELS } from "@/lib/types";
import { matchFixture } from "./fixtures";

const MODEL = "mock (fixtures + rules)";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- structure ----------

async function structure(input: StructureInput): Promise<StructuredCase> {
  const started = Date.now();
  await delay(900 + Math.random() * 300);

  const fx = matchFixture(input.transcript);
  if (fx) {
    return { sections: fx.sections, unclear: fx.unclear, detectedLanguage: fx.language, model: MODEL, latencyMs: Date.now() - started };
  }

  // Honest fallback for anything that isn't the scripted demo: put the
  // first sentence forward as the complaint and the rest into HPI at low
  // confidence, and say so. Real structuring needs the real model.
  const text = input.transcript.trim();
  const firstSentence = text.split(/(?<=[।.!?])\s+/)[0] ?? text;
  return {
    sections: {
      chief_complaint: { text: firstSentence, sourceQuote: firstSentence, confidence: 0.5 },
      hpi: { text, sourceQuote: text, confidence: 0.4 },
    },
    unclear: ["Mock AI is running — this transcript isn't the scripted sample, so it was placed in the complaint and HPI sections for you to edit. The live model structures any transcript."],
    detectedLanguage: input.language,
    model: MODEL,
    latencyMs: Date.now() - started,
  };
}

// ---------- gaps ----------
// Rule-based, deliberately conservative: every observation is about what the
// RECORD lacks, phrased so it can never read as a diagnosis or a recommendation.

const has = (s: string, re: RegExp) => re.test(s);
const filled = (s: string) => s.trim().length > 0;

async function detectGaps(input: CaseSheetInput): Promise<GapReport> {
  await delay(500 + Math.random() * 200);
  const s = input.sections;
  const v = input.vitals;
  const gaps: Gap[] = [];

  const cc = s.chief_complaint;
  const hpi = s.hpi;
  const exam = s.examination;
  const meds = s.medications;
  const plan = s.plan;
  const narrative = `${cc} ${hpi}`.toLowerCase();

  // Emptiness first — the obvious gaps.
  if (!filled(cc)) gaps.push({ section: "chief_complaint", severity: "high", observation: "No chief complaint recorded.", why: "The note has no presenting problem." });
  if (!filled(hpi)) gaps.push({ section: "hpi", severity: "high", observation: "History of present illness not documented.", why: filled(cc) ? `A complaint is recorded ("${cc.slice(0, 40)}…") but its course is not.` : "Nothing describes the course of the problem." });
  if (!filled(exam)) gaps.push({ section: "examination", severity: "high", observation: "No examination findings documented.", why: "A signed note is expected to record what was examined, including normal findings." });
  if (!filled(plan)) gaps.push({ section: "plan", severity: "high", observation: "No assessment or plan documented.", why: "The note ends without a recorded decision or follow-up." });
  if (!v || Object.values(v).every((x) => x === undefined)) gaps.push({ section: "vitals", severity: "medium", observation: "No vital signs recorded.", why: "Vitals are expected on every outpatient visit." });
  if (!filled(meds)) gaps.push({ section: "medications", severity: "medium", observation: "Medications and allergy status not documented.", why: "Current medicines and allergies are absent from the record." });

  // Content-aware rules — these are the ones that impress, and the ones that
  // must stay on the documentation side of the line.
  const bpHigh = (v?.bpSystolic ?? 0) >= 140 || (v?.bpDiastolic ?? 0) >= 90;
  if (bpHigh && filled(exam) && !has(exam, /cvs|cardio|heart|s1|s2|murmur|pulse/i)) {
    gaps.push({ section: "examination", severity: "high", observation: "Blood pressure is raised, but no cardiovascular examination findings are documented.", why: `BP ${v?.bpSystolic}/${v?.bpDiastolic} mmHg recorded in vitals.` });
  }
  const respFlag = (v?.spo2Percent !== undefined && v.spo2Percent < 95) || (v?.respRate !== undefined && v.respRate > 20);
  if (respFlag && filled(exam) && !has(exam, /\brs\b|resp|chest|lung|breath|air entry/i)) {
    gaps.push({ section: "examination", severity: "high", observation: "Oxygen saturation or respiratory rate is outside the usual range, but no respiratory examination is documented.", why: `SpO₂ ${v?.spo2Percent ?? "—"}%, RR ${v?.respRate ?? "—"}/min recorded in vitals.` });
  }
  const fever = (v?.temperatureF ?? 0) >= 100.4 || has(narrative, /fever|बुखार|febrile|pyrexia/);
  if (fever && filled(exam) && !has(exam, /throat|tonsil|chest|abdomen|rash|lymph|neck/i)) {
    gaps.push({ section: "examination", severity: "medium", observation: "Fever is recorded, but a focused examination (throat, chest, abdomen, skin) is not documented.", why: has(narrative, /fever|बुखार/) ? "Fever mentioned in the history." : `Temperature ${v?.temperatureF}°F recorded.` });
  }
  if (filled(cc) && !has(cc, /\d+\s*(day|week|month|year|hr|hour|दिन|हफ़?्ते|महीन|साल)|since|for the past|x\s*\d/i)) {
    gaps.push({ section: "chief_complaint", severity: "medium", observation: "Chief complaint is recorded without a duration.", why: `"${cc.slice(0, 60)}"` });
  }
  if (filled(meds) && !has(meds, /allerg|nkda|no known/i) && input.patient.allergies.length === 0) {
    gaps.push({ section: "medications", severity: "low", observation: "Allergy status is not stated in the medications section.", why: "No allergies are on file for this patient, and the note does not confirm that." });
  }
  if (filled(plan) && !has(plan, /follow|review|revisit|return|sos|week|day/i)) {
    gaps.push({ section: "plan", severity: "low", observation: "Follow-up timing is not stated in the plan.", why: "The plan records treatment but not when the patient should return." });
  }
  if (!filled(s.past_history)) gaps.push({ section: "past_history", severity: "low", observation: "Past history not documented.", why: "Even 'no significant past history' is a finding worth recording." });

  const order = { high: 0, medium: 1, low: 2 };
  gaps.sort((a, b) => order[a.severity] - order[b.severity]);
  const top = dedupe(gaps).slice(0, 5);

  // Score: seven expected items (six sections + vitals), minus a little for
  // each content-aware gap, so the number visibly climbs as gaps close.
  const keys = Object.keys(s) as SectionKey[];
  const items = keys.filter((k) => filled(s[k])).length + (v && Object.values(v).some((x) => x !== undefined) ? 1 : 0);
  let score = Math.round((items / (keys.length + 1)) * 100);
  const contentGaps = top.filter((g) => !/^No |not documented\.$|^Medications and allergy/.test(g.observation)).length;
  score = Math.max(0, Math.min(100, score - contentGaps * 6));

  const strengths = keys.filter((k) => s[k].trim().length >= 60).map((k) => `${SECTION_LABELS[k]} is well documented.`).slice(0, 2);

  return { completenessScore: score, gaps: top, strengths, model: MODEL, checkedAt: new Date().toISOString() };
}

function dedupe(gaps: Gap[]): Gap[] {
  const seen = new Set<string>();
  return gaps.filter((g) => {
    const k = g.observation;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------- summary ----------
// Template-based: uses only what is in the case sheet, omits empty sections,
// attributes the assessment to the doctor. Streams so the UI path is the same
// one the real model will use.

async function summarize(input: SummaryInput, onToken?: (chunk: string) => void): Promise<string> {
  const s = input.sections;
  const v = input.vitals;
  const parts: string[] = [];

  if (filled(s.chief_complaint)) parts.push(`PRESENTING COMPLAINT\n${s.chief_complaint.trim()}`);
  const hist = [s.hpi, s.past_history, s.medications].filter(filled).map((x) => x.trim()).join(" ");
  if (hist) parts.push(`HISTORY\n${hist}`);
  const vit: string[] = [];
  if (v?.bpSystolic && v.bpDiastolic) vit.push(`BP ${v.bpSystolic}/${v.bpDiastolic} mmHg`);
  if (v?.pulseBpm) vit.push(`pulse ${v.pulseBpm} bpm`);
  if (v?.temperatureF) vit.push(`temperature ${v.temperatureF}°F`);
  if (v?.spo2Percent) vit.push(`SpO₂ ${v.spo2Percent}%`);
  if (v?.bmi) vit.push(`BMI ${v.bmi}`);
  const examLine = [vit.length ? vit.join(", ") + "." : "", filled(s.examination) ? s.examination.trim() : ""].filter(Boolean).join(" ");
  if (examLine) parts.push(`EXAMINATION\n${examLine}`);
  if (filled(s.plan)) {
    const [assessment, ...rest] = s.plan.trim().split(/(?<=\.)\s+/);
    parts.push(`ASSESSMENT AS DOCUMENTED\nDocumented by the doctor: ${assessment}`);
    if (rest.length) parts.push(`PLAN\n${rest.join(" ")}`);
  }

  const full = parts.join("\n\n");
  if (onToken) {
    // ~40 tokens/sec feels like a real stream without dragging the demo.
    const tokens = full.split(/(\s+)/);
    for (const t of tokens) {
      onToken(t);
      await delay(t.trim() ? 22 : 4);
    }
  } else {
    await delay(800);
  }
  return full;
}

export const mockAi: AiClient = { name: MODEL, structure, detectGaps, summarize };
