import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { STRUCTURE_SYSTEM } from "@/lib/ai/prompts";
import { StructureOutput, StructureRequest } from "@/lib/ai/schemas";
import { AiRefused, MODEL, anthropic, errorResponse, logAiOutput, quoteIsInTranscript } from "@/lib/ai/server";
import { SECTION_LABELS, SECTION_ORDER } from "@/lib/types";
import type { StructuredCase } from "@/lib/ai/types";

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const input = StructureRequest.parse(await request.json());

    const response = await anthropic().messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system: [{ type: "text", text: STRUCTURE_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Patient: ${input.patient.ageYears}-year-old ${input.patient.gender}\nKnown allergies on file: ${input.patient.allergies.join(", ") || "none"}\nExpected language: ${input.language}\nConsultation transcript:\n"""\n${input.transcript}\n"""`,
        },
      ],
      output_config: { format: zodOutputFormat(StructureOutput), effort: "medium" },
    });

    if (response.stop_reason === "refusal") throw new AiRefused(response.stop_details?.category ?? null);
    const out = response.parsed_output;
    if (!out) throw new Error("The model returned no parseable output");

    // Enforce the quote rule in code. Dropped sections are reported, not hidden.
    const sections: StructuredCase["sections"] = {};
    const unclear = [...out.unclear];
    for (const key of SECTION_ORDER) {
      const s = out[key];
      if (!s || !s.text.trim()) continue;
      if (!quoteIsInTranscript(s.source_quote, input.transcript)) {
        unclear.push(`${SECTION_LABELS[key]} was dropped: its source quote could not be found in the transcript.`);
        continue;
      }
      sections[key] = { text: s.text.trim(), sourceQuote: s.source_quote, confidence: s.confidence };
    }

    const result: StructuredCase = {
      sections,
      unclear,
      detectedLanguage: out.detected_language,
      model: response.model,
      latencyMs: Date.now() - started,
    };

    void logAiOutput({
      consultationId: input.consultationId,
      kind: "structure",
      model: response.model,
      inputChars: input.transcript.length,
      output: result,
      latencyMs: result.latencyMs,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
