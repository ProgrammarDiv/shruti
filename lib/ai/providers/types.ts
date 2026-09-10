import type { z } from "zod";

// One interface the route handlers talk to; Claude and Gemini both sit behind it.
// Server-only — these hold API keys.

export type Effort = "low" | "medium" | "high";

export interface JsonResult<T> {
  data: T;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface TextResult {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface LlmProvider {
  readonly name: "anthropic" | "gemini";
  readonly model: string;
  // Structured output validated against the zod schema.
  generateJson<T>(opts: { system: string; user: string; schema: z.ZodType<T>; effort: Effort; maxTokens: number }): Promise<JsonResult<T>>;
  // Plain text, streamed through onText, resolved with the full text.
  streamText(opts: { system: string; user: string; effort: Effort; maxTokens: number; onText: (chunk: string) => void }): Promise<TextResult>;
}

export class AiUnavailable extends Error {}
export class AiRefused extends Error {
  constructor(public category: string | null) {
    super("The model declined this request");
  }
}
export class ProviderError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
