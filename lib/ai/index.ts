// The only AI module components may import.
//
// Today `ai` is the rule-based mock. When the Claude-backed route handlers
// land, this becomes:
//
//   export const ai: AiClient = process.env.NEXT_PUBLIC_AI_MODE === "mock" ? mockAi : liveAi;
//
// with `liveAi` calling /api/ai/* (the key never reaches the browser). The mock
// stays as the DEMO_MODE fallback — the same UI path, cached responses.

import type { AiClient } from "./types";
import { mockAi } from "./mock/client";

export type * from "./types";
export const ai: AiClient = mockAi;
