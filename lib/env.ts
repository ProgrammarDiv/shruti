// Runtime mode, decided by environment variables. NEXT_PUBLIC_* values are
// inlined at build time, so these are safe to read in the browser.
//
//   no Supabase vars  → localStorage mock data layer, no login
//   Supabase vars set → Supabase data layer with email/password auth
//   NEXT_PUBLIC_AI_MODE=live → Claude via /api/ai/*; anything else → rule-based mock

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const hasSupabase = supabaseUrl.length > 0 && supabaseKey.length > 0;

export const aiMode: "live" | "mock" = process.env.NEXT_PUBLIC_AI_MODE === "live" ? "live" : "mock";

export const DEMO_LOGIN = { email: "doctor@shruti.demo", password: "shruti-demo-2026" };
