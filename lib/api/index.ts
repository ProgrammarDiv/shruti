// The only data module components may import.
//
// With NEXT_PUBLIC_SUPABASE_URL and a key in .env.local, `api` is the Supabase
// client (real Postgres, row-level security, sign-in required). Without them it
// is the localStorage mock with seeded demo data. Nothing in components/ or
// app/ knows which one it is talking to.

import type { DataClient } from "./types";
import { hasSupabase } from "@/lib/env";
import { mockClient } from "./mock/client";
import { supabaseClient } from "./supabase/client";

export type { DataClient } from "./types";
export const api: DataClient = hasSupabase ? supabaseClient : mockClient;
