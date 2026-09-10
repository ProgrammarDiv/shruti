// The only data module components may import.
//
// Today `api` is the localStorage-backed mock. When the Supabase backend lands,
// this file changes to:
//
//   import { supabaseClient } from "./supabase/client";
//   export const api: DataClient = supabaseClient;
//
// and nothing in components/ or app/ needs to change.

import type { DataClient } from "./types";
import { mockClient } from "./mock/client";

export type { DataClient } from "./types";
export const api: DataClient = mockClient;
