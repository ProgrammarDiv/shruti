import { SUMMARY_SYSTEM } from "@/lib/ai/prompts";
import { SummaryRequest } from "@/lib/ai/schemas";
import { errorResponse, logAiOutput, provider } from "@/lib/ai/server";

// Streams plain text so the review page can show the summary appearing.
export async function POST(request: Request) {
  const started = Date.now();
  try {
    const input = SummaryRequest.parse(await request.json());
    const v = input.vitals ?? {};
    const vitalsLine = [
      v.bpSystolic && v.bpDiastolic ? `BP ${v.bpSystolic}/${v.bpDiastolic} mmHg` : null,
      v.pulseBpm ? `pulse ${v.pulseBpm} bpm` : null,
      v.temperatureF ? `temperature ${v.temperatureF}°F` : null,
      v.respRate ? `RR ${v.respRate}/min` : null,
      v.spo2Percent ? `SpO2 ${v.spo2Percent}%` : null,
      v.bmi ? `BMI ${v.bmi}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const user = [
      `Patient: ${input.patientName}, ${input.patient.ageYears}-year-old ${input.patient.gender}`,
      `Date: ${input.date}`,
      `Doctor: ${input.doctorLine}`,
      `Allergies on file: ${input.patient.allergies.join(", ") || "none recorded"}`,
      "",
      "Case sheet:",
      `Chief complaint: ${input.sections.chief_complaint || "(empty)"}`,
      `History of present illness: ${input.sections.hpi || "(empty)"}`,
      `Past history: ${input.sections.past_history || "(empty)"}`,
      `Medications & allergies: ${input.sections.medications || "(empty)"}`,
      `Examination: ${input.sections.examination || "(empty)"}`,
      `Vitals: ${vitalsLine || "(not recorded)"}`,
      `Assessment & plan: ${input.sections.plan || "(empty)"}`,
    ].join("\n");

    const llm = provider();
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const result = await llm.streamText({
            system: SUMMARY_SYSTEM,
            user,
            effort: "medium",
            maxTokens: 4000,
            onText: (chunk) => controller.enqueue(encoder.encode(chunk)),
          });
          void logAiOutput({ consultationId: input.consultationId, kind: "summary", model: result.model, inputChars: user.length, output: { text: result.text }, latencyMs: Date.now() - started, inputTokens: result.inputTokens, outputTokens: result.outputTokens });
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
