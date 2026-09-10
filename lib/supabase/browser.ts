"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/env";

let client: SupabaseClient | null = null;

// One browser client per tab. Sessions live in cookies so the server and the
// proxy see the same login the browser made.
export function supabaseBrowser(): SupabaseClient {
  if (!client) client = createBrowserClient(supabaseUrl, supabaseKey);
  return client;
}
