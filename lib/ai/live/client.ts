import type { AiClient, CaseSheetInput, GapReport, StructureInput, StructuredCase, SummaryInput } from "@/lib/ai/types";
import { mockAi } from "@/lib/ai/mock/client";

// Calls the Claude-backed route handlers. Every method falls back to the
// rule-based mock if the call fails, times out, or is refused — so the
// consultation never depends on a network call succeeding. The result's
// `model` field says which one answered.

async function post(path: string, body: unknown, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
    if (!res.ok) {
      let msg = `${res.status}`;
      try {
        const j = (await res.json()) as { error?: { code?: string; message?: string } };
        msg = j.error?.code ? `${j.error.code}: ${j.error.message ?? ""}` : msg;
      } catch {
        /* non-JSON error body */
      }
      throw new Error(msg);
    }
    return res;
  } finally {
    window.clearTimeout(t);
  }
}

function reason(e: unknown) {
  if (e instanceof DOMException && e.name === "AbortError") return "timeout";
  return e instanceof Error ? e.message : "error";
}

export const liveAi: AiClient = {
  name: "claude",

  async structure(input: StructureInput): Promise<StructuredCase> {
    try {
      const res = await post("/api/ai/structure", input, 40_000);
      return (await res.json()) as StructuredCase;
    } catch (e) {
      const r = await mockAi.structure(input);
      return { ...r, model: `mock — fallback (${reason(e)})` };
    }
  },

  async detectGaps(input: CaseSheetInput): Promise<GapReport> {
    try {
      const res = await post("/api/ai/gaps", input, 30_000);
      return (await res.json()) as GapReport;
    } catch (e) {
      const r = await mockAi.detectGaps(input);
      return { ...r, model: `mock — fallback (${reason(e)})` };
    }
  },

  async summarize(input: SummaryInput, onToken?: (chunk: string) => void): Promise<string> {
    try {
      const res = await post("/api/ai/summary", input, 60_000);
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        onToken?.(chunk);
      }
      if (!full.trim()) throw new Error("empty summary");
      return full;
    } catch {
      return mockAi.summarize(input, onToken);
    }
  },
};
