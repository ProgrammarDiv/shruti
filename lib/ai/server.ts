// Server-side helpers for the /api/ai/* route handlers. Never import this
// from a client component — it holds the Anthropic client and the API key.

import Anthropic from "@anthropic-ai/sdk";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

export const MODEL = process.env.AI_MODEL || "claude-opus-5";

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiUnavailable("ANTHROPIC_API_KEY is not set");
  // Timeout is in milliseconds for the TypeScript SDK. A consultation-time
  // call that takes longer than this is worse than a fallback.
  if (!client) client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
  return client;
}

export class AiUnavailable extends Error {}
export class AiRefused extends Error {
  constructor(public category: string | null) {
    super("The model declined this request");
  }
}

export function jsonError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

// Maps SDK/validation failures to a response the browser client can act on.
// Anything here makes the client fall back to the mock, so the exact status
// matters less than being explicit about why.
export function errorResponse(err: unknown) {
  if (err instanceof AiUnavailable) return jsonError(503, "unavailable", err.message);
  if (err instanceof AiRefused) return jsonError(502, "refusal", `Declined (${err.category ?? "unspecified"})`);
  if (err instanceof Anthropic.AuthenticationError) return jsonError(503, "auth", "Anthropic API key was rejected");
  if (err instanceof Anthropic.RateLimitError) return jsonError(429, "rate_limited", "Rate limited by the model provider");
  if (err instanceof Anthropic.APIConnectionTimeoutError) return jsonError(504, "timeout", "The model took too long");
  if (err instanceof Anthropic.APIError) return jsonError(502, "provider", `${err.status ?? ""} ${err.message}`.trim());
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
