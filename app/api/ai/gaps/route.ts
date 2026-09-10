import { GAPS_SYSTEM } from "@/lib/ai/prompts";
import { GapsOutput, GapsRequest } from "@/lib/ai/schemas";
import { errorResponse, logAiOutput, provider } from "@/lib/ai/server";
import type { GapReport } from "@/lib/ai/types";

function caseSheetText(input: ReturnType<typeof GapsRequest.parse>) {
  const v = input.vitals ?? {};
  const fmt = (x?: number, unit = "") => (x === undefined ? "—" : `${x}${unit}`);
  return [
    `Patient: ${input.patient.ageYears}-year-old ${input.patient.gender}`,
    `Allergies on file: ${input.patient.allergies.join(", ") || "none recorded"}`,
    "",
    "Current case sheet:",
    `Chief complaint: ${input.sections.chief_complaint || "(empty)"}`,
    `History of present illness: ${input.sections.hpi || "(empty)"}`,
    `Past history: ${input.sections.past_history || "(empty)"}`,
    `Medications & allergies: ${input.sections.medications || "(empty)"}`,
    `Examination: ${input.sections.examination || "(empty)"}`,
    `Vitals: BP ${v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic} mmHg` : "—"}, pulse ${fmt(v.pulseBpm, " bpm")}, temp ${fmt(v.temperatureF, "°F")}, RR ${fmt(v.respRate, "/min")}, SpO2 ${fmt(v.spo2Percent, "%")}, BMI ${fmt(v.bmi)}`,
    `Assessment & plan: ${input.sections.plan || "(empty)"}`,
  ].join("\n");
}

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const input = GapsRequest.parse(await request.json());

    // Runs after every save — keep it quick.
    const { data: out, model, inputTokens, outputTokens } = await provider().generateJson({
      system: GAPS_SYSTEM,
      user: caseSheetText(input),
      schema: GapsOutput,
      effort: "low",
      maxTokens: 8000,
    });

    const report: GapReport = {
      completenessScore: Math.max(0, Math.min(100, Math.round(out.completeness_score))),
      gaps: out.gaps.slice(0, 5),
      strengths: out.strengths.slice(0, 3),
      model,
      checkedAt: new Date().toISOString(),
    };

    void logAiOutput({ consultationId: input.consultationId, kind: "gaps", model, inputChars: JSON.stringify(input.sections).length, output: report, latencyMs: Date.now() - started, inputTokens, outputTokens });

    return Response.json(report);
  } catch (err) {
    return errorResponse(err);
  }
}
