import { SUMMARY_SYSTEM } from "@/lib/ai/prompts";
import { SummaryRequest } from "@/lib/ai/schemas";
import { AiRefused, MODEL, anthropic, errorResponse, logAiOutput } from "@/lib/ai/server";

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

    const stream = anthropic().messages.stream({
      model: MODEL,
      max_tokens: 4000,
      system: [{ type: "text", text: SUMMARY_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
      output_config: { effort: "medium" },
    });

    const encoder = new TextEncoder();
    let full = "";
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              full += event.delta.text;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          const final = await stream.finalMessage();
          if (final.stop_reason === "refusal") throw new AiRefused(final.stop_details?.category ?? null);
          void logAiOutput({
            consultationId: input.consultationId,
            kind: "summary",
            model: final.model,
            inputChars: user.length,
            output: { text: full },
            latencyMs: Date.now() - started,
            inputTokens: final.usage.input_tokens,
            outputTokens: final.usage.output_tokens,
          });
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
