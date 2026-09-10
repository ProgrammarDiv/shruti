import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AiRefused, ProviderError, type LlmProvider } from "./types";

let client: Anthropic | null = null;
function sdk(): Anthropic {
  // Timeout is in milliseconds for the TypeScript SDK. A consultation-time
  // call that takes longer than this is worse than a fallback.
  if (!client) client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
  return client;
}

// Maps SDK errors to one shape the route handler can report on.
function translate(err: unknown): never {
  if (err instanceof AiRefused) throw err;
  if (err instanceof Anthropic.AuthenticationError) throw new ProviderError(503, "Anthropic API key was rejected");
  if (err instanceof Anthropic.RateLimitError) throw new ProviderError(429, "Rate limited by Anthropic");
  if (err instanceof Anthropic.APIConnectionTimeoutError) throw new ProviderError(504, "Anthropic took too long");
  if (err instanceof Anthropic.APIError) throw new ProviderError(502, `Anthropic ${err.status ?? ""} ${err.message}`.trim());
  throw err;
}

export function anthropicProvider(model: string): LlmProvider {
  return {
    name: "anthropic",
    model,

    async generateJson({ system, user, schema, effort, maxTokens }) {
      try {
        const response = await sdk().messages.parse({
          model,
          max_tokens: maxTokens,
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: user }],
          output_config: { format: zodOutputFormat(schema), effort },
        });
        if (response.stop_reason === "refusal") throw new AiRefused(response.stop_details?.category ?? null);
        if (!response.parsed_output) throw new ProviderError(502, "The model returned no parseable output");
        return { data: response.parsed_output, model: response.model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
      } catch (err) {
        translate(err);
      }
    },

    async streamText({ system, user, effort, maxTokens, onText }) {
      try {
        const stream = sdk().messages.stream({
          model,
          max_tokens: maxTokens,
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: user }],
          output_config: { effort },
        });
        let text = "";
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            text += event.delta.text;
            onText(event.delta.text);
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") throw new AiRefused(final.stop_details?.category ?? null);
        return { text, model: final.model, inputTokens: final.usage.input_tokens, outputTokens: final.usage.output_tokens };
      } catch (err) {
        translate(err);
      }
    },
  };
}
