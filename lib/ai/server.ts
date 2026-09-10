// Server-side helpers for the /api/ai/* route handlers. Never import this
// from a client component — it selects the provider that holds the API key.

import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { anthropicProvider } from "./providers/anthropic";
import { geminiProvider } from "./providers/gemini";
import { AiRefused, AiUnavailable, ProviderError, type LlmProvider } from "./providers/types";

export { AiRefused, AiUnavailable, ProviderError };

// gemini-2.5-flash is retired for new accounts; 3.6-flash is Google's stated replacement.
const DEFAULT_MODEL = { anthropic: "claude-opus-5", gemini: "gemini-3.6-flash" } as const;

// AI_PROVIDER picks explicitly; otherwise whichever key is present wins,
// Claude first. AI_MODEL overrides the provider's default model.
export function provider(): LlmProvider {
  const wanted = process.env.AI_PROVIDER as "anthropic" | "gemini" | undefined;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const name = wanted ?? (hasClaude ? "anthropic" : hasGemini ? "gemini" : undefined);
  if (!name) throw new AiUnavailable("No AI key is set (ANTHROPIC_API_KEY or GEMINI_API_KEY)");
  if (name === "anthropic" && !hasClaude) throw new AiUnavailable("AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set");
  if (name === "gemini" && !hasGemini) throw new AiUnavailable("AI_PROVIDER=gemini but GEMINI_API_KEY is not set");
  const model = process.env.AI_MODEL || DEFAULT_MODEL[name];
  return name === "anthropic" ? anthropicProvider(model) : geminiProvider(model);
}

export function jsonError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

// Anything here makes the browser client fall back to the mock, so the
// exact status matters less than being explicit about why.
export function errorResponse(err: unknown) {
  if (err instanceof AiUnavailable) return jsonError(503, "unavailable", err.message);
  if (err instanceof AiRefused) return jsonError(502, "refusal", `Declined (${err.category ?? "unspecified"})`);
  if (err instanceof ProviderError) return jsonError(err.status, err.status === 429 ? "rate_limited" : err.status === 504 ? "timeout" : err.status === 503 ? "auth" : "provider", err.message);
  if (err instanceof Error && err.name === "ZodError") return jsonError(400, "bad_request", err.message);
  return jsonError(500, "unknown", err instanceof Error ? err.message : "Unknown error");
}

// Every model call is logged — the "can you audit the AI?" answer. Best
// effort: a logging failure never fails the request.
export async function logAiOutput(row: {
  consultationId?: string;
  kind: "structure" | "gaps" | "summary";
  model: string;
  inputChars: number;
  output: unknown;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}) {
  if (!hasSupabase) return;
  try {
    const sb = await supabaseServer();
    await sb.from("ai_outputs").insert({
      consultation_id: row.consultationId ?? null,
      kind: row.kind,
      model: row.model,
      input_chars: row.inputChars,
      output: row.output,
      latency_ms: row.latencyMs,
      input_tokens: row.inputTokens ?? null,
      output_tokens: row.outputTokens ?? null,
    });
  } catch (e) {
    console.warn("ai_outputs log failed:", e instanceof Error ? e.message : e);
  }
}

// ---- source-quote verification ----
// A prompt instruction becomes a hard guarantee here: a section survives only
// if every fragment of its quote is literally in the transcript.

function normalise(s: string) {
  return s.normalize("NFC").toLowerCase().replace(/[\s​‌‍]+/g, " ").replace(/[.,;:!?।॥"'“”‘’()\-–—]/g, "").trim();
}

export function quoteIsInTranscript(quote: string, transcript: string): boolean {
  const t = normalise(transcript);
  const fragments = quote
    .split(/…|\.\.\./)
    .map(normalise)
    .filter((f) => f.length > 0);
  if (fragments.length === 0) return false;
  return fragments.every((f) => t.includes(f));
}
