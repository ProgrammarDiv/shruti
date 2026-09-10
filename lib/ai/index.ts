// The only AI module components may import.
//
// NEXT_PUBLIC_AI_MODE=live → Claude via /api/ai/* (the key stays on the
// server), with the rule-based mock as the automatic fallback.
// Anything else → the mock alone. Same interface, same UI path.

import type { AiClient } from "./types";
import { aiMode } from "@/lib/env";
import { mockAi } from "./mock/client";
import { liveAi } from "./live/client";

export type * from "./types";
export const ai: AiClient = aiMode === "live" ? liveAi : mockAi;
