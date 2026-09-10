# Shruti

**Speak the case. Sign the record.** Voice-first, multilingual clinical documentation for Indian outpatient clinics. The consultation is spoken in the patient's language and emerges as a structured, doctor-verified English case sheet — every AI-written word marked, nothing entering the record until a doctor accepts it.

Built for Smart India Hackathon 2026.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no configuration it runs on **demo data** — eight seeded patients in `localStorage`, no sign-in, a rule-based AI stand-in. Everything works; **Reset demo data** in the sidebar restores the seed.

## Turn on the real backend

Copy `.env.example` to `.env.local` and fill in what you have. Each part is independent.

### Supabase — database and login

1. Create a project at supabase.com. Project settings → API: copy the URL and the publishable (or anon) key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
   ```
2. SQL editor → paste and run `supabase/schema.sql`.
3. Authentication → Users → **Add user**: email `doctor@shruti.demo`, password `shruti-demo-2026`, *Auto confirm user* on.
4. SQL editor → paste and run `supabase/seed.sql`. It creates the demo clinic, Dr. Anjali Rao's profile and the same eight patients the mock has.
5. Restart `npm run dev`. You'll land on `/login`; the **Demo login** button signs in as Dr. Rao.

Data now lives in Postgres with row-level security scoping every row to the doctor's clinic; signed notes are made immutable by a database trigger, not just by the UI.

### Live AI — Claude or Gemini

Either key works; the route handlers sit behind one provider interface.

```
ANTHROPIC_API_KEY=sk-ant-…        # console.anthropic.com
# or
GEMINI_API_KEY=AIza…              # aistudio.google.com → Get API key (free tier)

NEXT_PUBLIC_AI_MODE=live
```

Restart. Structuring, the gap check and the summary now call the model through `/api/ai/*` — the key never reaches the browser. Claude is preferred when both keys are set; `AI_PROVIDER=gemini` forces Gemini, `AI_MODEL=…` overrides the model. Every call is logged to `ai_outputs` when Supabase is on. If a call fails, times out or is refused, the rule-based mock answers instead and the result's model label says so. That fallback is the demo-day safety net, and it is exercised constantly because it's the same code path as mock mode.

## Where things are

```
lib/api/index.ts        ← the data seam: mock ↔ Supabase, one line
lib/ai/index.ts         ← the AI seam: mock ↔ Claude, one line
lib/types.ts            ← the domain model; mirrors supabase/schema.sql
lib/api/mock/           localStorage DataClient + seed data
lib/api/supabase/       Postgres DataClient
lib/ai/mock/            rule-based gap engine, fixtures, template summary
lib/ai/live/            browser client for /api/ai/* with automatic fallback
lib/ai/prompts.ts       the three prompts
lib/ai/server.ts        Anthropic client, quote verification, audit logging
app/api/ai/             structure · gaps · summary route handlers
app/(app)/              dashboard, patients, consultation workspace, review
components/consult/     the workspace, voice & gaps panels, the note document
supabase/               schema.sql · seed.sql
proxy.ts                auth gate (only active when Supabase is configured)
```

## The rules the code enforces

- **Nothing AI-written enters the record unreviewed.** Sections arrive as amber drafts; the review page refuses to sign while any draft is unaccepted.
- **Every AI section carries a verbatim source quote**, and the server drops any section whose quote isn't literally in the transcript.
- **The AI checks the record, not the patient.** Gap observations are about documentation; the prompts and the mock rules never emit a diagnosis, a test or a treatment.
- **A signed note is immutable** — enforced by a Postgres trigger, with the UI reflecting it.

## Scripts

```bash
npm run dev      # dev server
npm run lint     # eslint
npx tsc --noEmit # typecheck
npm run build    # production build
```
