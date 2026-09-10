import { z } from "zod";
import { AiRefused, ProviderError, type LlmProvider } from "./types";

// Gemini over its REST API (no SDK to drift). JSON mode is requested and the
// schema is stated in the system instruction; the response is validated with
// zod and retried once with the validation error if it doesn't conform.

const BASE = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { code?: number; message?: string };
}

function key(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new ProviderError(503, "GEMINI_API_KEY is not set");
  return k;
}

async function call(model: string, method: "generateContent" | "streamGenerateContent", body: unknown, signal: AbortSignal): Promise<Response> {
  const url = `${BASE}/models/${model}:${method}${method === "streamGenerateContent" ? "?alt=sse" : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key() },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as GeminiResponse;
      msg = j.error?.message ?? msg;
    } catch {
      /* non-JSON */
    }
    if (res.status === 400 && /API key/i.test(msg)) throw new ProviderError(503, "Gemini API key was rejected");
    if (res.status === 429) throw new ProviderError(429, "Rate limited by Gemini");
    throw new ProviderError(502, `Gemini ${res.status}: ${msg}`);
  }
  return res;
}

function textOf(r: GeminiResponse): string {
  const c = r.candidates?.[0];
  if (r.promptFeedback?.blockReason) throw new AiRefused(r.promptFeedback.blockReason);
  if (c?.finishReason === "SAFETY" || c?.finishReason === "PROHIBITED_CONTENT") throw new AiRefused(c.finishReason);
  return (c?.content?.parts ?? []).map((p) => p.text ?? "").join("");
}

// zod → a JSON Schema the prompt can state. Gemini's structured-output schema
// dialect is narrower than JSON Schema, so we describe rather than enforce.
function describeSchema(schema: z.ZodType): string {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return JSON.stringify(json);
}

function withTimeout(ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

export function geminiProvider(model: string): LlmProvider {
  return {
    name: "gemini",
    model,

    async generateJson({ system, user, schema, effort, maxTokens }) {
      // Gemini 3.x accepts thinkingLevel (not the older thinkingBudget). "low"
      // takes the after-every-save gap check from ~6 s to under 2 s.
      const thinkingConfig = effort === "low" ? { thinkingLevel: "low" } : undefined;
      const instruction = `${system}\n\nRespond with a single JSON object and nothing else. It must match this JSON Schema exactly (use null for a nullable field you cannot fill):\n${describeSchema(schema)}`;
      let userText = user;
      let lastError = "";
      for (let attempt = 0; attempt < 2; attempt++) {
        const t = withTimeout(45_000);
        try {
          const res = await call(
            model,
            "generateContent",
            {
              systemInstruction: { parts: [{ text: instruction }] },
              contents: [{ role: "user", parts: [{ text: userText }] }],
              generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: maxTokens, ...(thinkingConfig ? { thinkingConfig } : {}) },
            },
            t.signal,
          );
          const json = (await res.json()) as GeminiResponse;
          const raw = textOf(json);
          const parsed = schema.safeParse(JSON.parse(stripFences(raw)));
          if (parsed.success) {
            return { data: parsed.data, model, inputTokens: json.usageMetadata?.promptTokenCount, outputTokens: json.usageMetadata?.candidatesTokenCount };
          }
          lastError = parsed.error.message;
          userText = `${user}\n\nYour previous response did not match the schema:\n${lastError}\nReturn only a corrected JSON object.`;
        } catch (err) {
          if (err instanceof SyntaxError) {
            lastError = "not valid JSON";
            userText = `${user}\n\nYour previous response was not valid JSON. Return only the JSON object.`;
            continue;
          }
          if (err instanceof DOMException && err.name === "AbortError") throw new ProviderError(504, "Gemini took too long");
          throw err;
        } finally {
          t.done();
        }
      }
      throw new ProviderError(502, `Gemini output did not match the schema: ${lastError}`);
    },

    async streamText({ system, user, maxTokens, onText }) {
      const t = withTimeout(60_000);
      try {
        const res = await call(
          model,
          "streamGenerateContent",
          {
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
          },
          t.signal,
        );
        if (!res.body) throw new ProviderError(502, "Gemini returned no body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        let inputTokens: number | undefined;
        let outputTokens: number | undefined;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            const chunk = JSON.parse(payload) as GeminiResponse;
            const piece = textOf(chunk);
            if (piece) {
              text += piece;
              onText(piece);
            }
            inputTokens = chunk.usageMetadata?.promptTokenCount ?? inputTokens;
            outputTokens = chunk.usageMetadata?.candidatesTokenCount ?? outputTokens;
          }
        }
        return { text, model, inputTokens, outputTokens };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw new ProviderError(504, "Gemini took too long");
        throw err;
      } finally {
        t.done();
      }
    },
  };
}

function stripFences(s: string) {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}
