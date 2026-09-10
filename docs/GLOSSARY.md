# Shruti — every technical term, in plain words

For the team, before judging. Each entry: what the word means, what it is in Shruti, and the sentence to say out loud.

## The product in one breath

> "In an Indian OPD the patient speaks Hindi but the record must be in English. Shruti listens in the patient's language, drafts a structured case sheet, marks every AI-written word, and lets the doctor accept, edit or reject each one before signing. It documents — it never diagnoses."

---

## 1. How the app is built

| Term | Plain meaning | In Shruti | Say to judges |
|---|---|---|---|
| **Frontend** | The part of the app that runs in the browser — what the user sees and clicks. | The dashboard, patient list, consultation workspace, review page. | "The whole doctor-facing UI is the frontend." |
| **Backend** | Code that runs on a server, not in the browser. Holds secrets, talks to the database and to AI. | Three route handlers under `/api/ai/*` and the auth gate. | "Our backend is small on purpose: three AI endpoints and an auth check." |
| **Next.js** | A framework that lets one project contain both frontend and backend, in one language. | The whole app is one Next.js project. | "One codebase, one deploy — no separate server to keep in sync." |
| **React** | The library Next.js uses to build screens out of reusable pieces. | Every screen is a React component. | — |
| **TypeScript** | JavaScript with types — the computer checks that data has the right shape before the code runs. | Everything, front and back. One file (`lib/types.ts`) defines what a Patient or a Consultation is, and both sides use it. | "Frontend and backend share one type definition, so a mismatch is caught at compile time, not on stage." |
| **Component** | A self-contained piece of UI you can reuse — a button, a card, a whole panel. | `SectionEditor`, `VitalsForm`, `GapsPanel`, `NoteDocument`… | — |
| **Tailwind CSS** | A way of styling by adding small utility classes directly in the markup instead of writing separate CSS files. | All styling. | — |
| **shadcn/ui** | A set of ready-made, accessible components (buttons, dialogs, tabs) you copy into your project and own. | Buttons, inputs, tabs, dialogs, cards. | "We didn't build a component library; we used an accessible one and styled it." |
| **Route handler** | A URL on the server that runs code when called — an API endpoint. | `POST /api/ai/structure`, `/api/ai/gaps`, `/api/ai/summary`. | "The browser never talks to the AI directly — it calls our route handler, which holds the key." |
| **Proxy / middleware** | Code that runs before every request and can redirect or block it. | `proxy.ts` — sends you to `/login` if you're not signed in, returns 401 on API calls without a session. | "Every request passes an auth check before it reaches a page." |
| **Client component vs server component** | In Next.js, some components render on the server, others in the browser. Anything interactive (typing, buttons, microphone) must be a client component. | Almost all screens are client components because the workspace is interactive. | — |
| **Environment variable** | A setting stored outside the code — usually a secret or a switch — read when the app starts. | `.env.local` locally, Vercel settings in production: Supabase URL and key, Gemini key, `NEXT_PUBLIC_AI_MODE`. | "Secrets live in environment variables, never in the repository." |
| **`NEXT_PUBLIC_` prefix** | Marks an environment variable as safe to send to the browser. Anything without it stays on the server. | The Supabase URL/key are public; the Gemini key is not. | "The AI key never reaches the browser — you can check the network tab." |
| **Git / GitHub** | Git tracks every change to the code; GitHub hosts the repository online. | 14 commits, one per step; repo at github.com/ProgrammarDiv/shruti. | "Every step is a commit; you can read the project's history." |
| **CI (continuous integration)** | An automatic check that runs on every push: lint, type check, build. | `.github/workflows/ci.yml`. | "Every push is lint-checked, type-checked and built automatically." |
| **Lint** | An automatic code-quality check for mistakes and bad patterns. | ESLint with the React rules. | — |
| **Build** | Turning the source code into the optimised version that actually runs in production. | `npm run build` — passes clean. | — |
| **Deployment / Vercel** | Putting the app on the internet. Vercel hosts Next.js apps and redeploys on every push. | https://shruti-puce.vercel.app | "Pushing to `main` redeploys automatically." |
| **Production vs preview URL** | Vercel makes a permanent production URL plus a temporary one per deployment. Preview URLs are locked to the owner's Vercel account. | Share `shruti-puce.vercel.app`, not the long `shruti-o1s7…` link. | — |
| **HTTPS / secure origin** | Encrypted connection. Browsers only allow the microphone on HTTPS or localhost. | Voice works on the Vercel URL; not over a plain `http://192.168…` address. | "Voice needs HTTPS, which the deployment provides." |
| **localStorage** | A small storage area inside the browser that survives refreshes. | Demo mode keeps all data here — no server needed. | "Demo mode runs entirely in the browser; nothing leaves the device." |
| **Mock / demo mode** | A stand-in for a real service that behaves the same way but uses fixed data. | With no keys set, data lives in localStorage and the AI is rule-based. | "The mock is also our fallback — if the AI service fails on stage, the same screens keep working." |
| **Autosave / debounce** | Saving automatically; "debounce" means waiting until typing pauses (0.8 s) so you don't save on every keystroke. | The workspace saves 0.8 s after you stop typing, and on blur. | "A doctor never loses a sentence — autosave, and a warning if you try to leave with unsaved text." |
| **Idempotent** | Doing the same operation twice has the same effect as once. | Saves are keyed by section, so a repeated save can't create duplicates. | — |

## 2. The database and login

| Term | Plain meaning | In Shruti | Say to judges |
|---|---|---|---|
| **Supabase** | A hosted service that gives you a Postgres database, login, and file storage together. | Database + authentication. | "Postgres and auth in one managed service — we built no login system ourselves." |
| **PostgreSQL / Postgres** | A mature, open-source relational database. | Seven tables. | — |
| **Schema** | The design of the database: which tables exist and what columns each has. | `supabase/schema.sql`, mirrors `lib/types.ts`. | — |
| **Table / row / column** | A table is like a spreadsheet; a row is one record; a column is one field. | `patients`, `consultations`, `case_sections`, `vitals`, `profiles`, `clinics`, `ai_outputs`. | — |
| **Primary key** | The column that uniquely identifies a row. | `id` (a UUID) on every table. | — |
| **Foreign key** | A column that points to a row in another table — how tables link. | `consultations.patient_id` → `patients.id`. | "A visit belongs to a patient by foreign key." |
| **UUID** | A long random ID that can't be guessed or collide. | All IDs. | — |
| **Row-level security (RLS)** | Rules inside the database that decide which rows each user may see or change — enforced by Postgres itself, not by app code. | Every table: `clinic_id = the signed-in doctor's clinic`. | "Even a bug in our code can't leak another clinic's patients — the database refuses." |
| **Trigger** | Code inside the database that runs automatically when a row is inserted or changed. | One assigns patient codes (SHR-2026-0149); one blocks edits to a signed consultation. | "Immutability is enforced by the database, not just by hiding a button." |
| **Immutability** | Once written, it cannot be changed. | A signed note. Corrections would be addenda. | "Medical records are legal documents — signed notes can't be edited." |
| **Seed data** | Realistic fake data loaded so the app isn't empty. | `supabase/seed.sql`: Dr. Anjali Rao, 8 patients, 6 signed visits. | "Everything you see is synthetic — no real patient data was used." |
| **Publishable / anon key** | The public Supabase key the browser uses. Safe to expose because RLS limits what it can do. | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. | — |
| **Authentication (auth)** | Proving who you are — logging in. | Supabase email + password. | — |
| **Session / cookie** | After login the browser holds a token in a cookie so the server knows who you are on each request. | Supabase sessions in cookies; the proxy reads them. | — |
| **Auth gate** | The check that sends signed-out users to the login page. | `proxy.ts`. | — |
| **Password hashing** | Passwords are stored as a one-way scramble; nobody, including us, can read them. | Handled by Supabase Auth. | "We never see or store passwords." |
| **Audit log** | A record of what happened and when, that can only be added to. | `ai_outputs` — every AI call, its input size, output, model, latency, tokens. | "You can audit every AI call the system ever made." |

## 3. The AI

| Term | Plain meaning | In Shruti | Say to judges |
|---|---|---|---|
| **LLM (large language model)** | An AI model that reads and writes text. | Gemini 3.6 Flash (or Claude — both supported). | — |
| **API key** | A secret string that lets our server call the AI service. | `GEMINI_API_KEY`, server-only. | — |
| **Provider** | The company/model behind the AI. | Gemini or Anthropic, switchable by one setting. | "Swapping the AI provider is a config change, not a rewrite." |
| **Prompt** | The instructions we send the model. | Three prompts in `lib/ai/prompts.ts`. | — |
| **System prompt** | The part of the prompt that sets the rules the model must follow. | "Record only what was said. Never suggest a diagnosis. Quote your source." | "The rules are in the prompt — and the important ones are enforced again in code." |
| **Structured output / JSON mode** | Asking the model to answer in a fixed data format instead of free text. | The model returns the six sections as JSON. | — |
| **Schema validation (zod)** | Checking that the model's answer has exactly the expected shape; rejecting it otherwise. | Every AI response is validated; a bad one is retried once, then falls back. | "A malformed AI answer can't reach the screen." |
| **Hallucination** | When an AI states something that wasn't in its input. | The main risk in clinical documentation. | — |
| **Source quote** | The exact words from the transcript that justify each AI-written section. | Every section carries one; you can open it under "Source in transcript". | "Every AI sentence points at the words the patient actually said." |
| **Source-quote verification** | The server checks that the quote really appears in the transcript; if not, the section is dropped. | `quoteIsInTranscript()` in `lib/ai/server.ts`. | "It's not a prompt instruction we hope the model follows — the server drops any section whose quote isn't literally in the transcript." |
| **Confidence** | The model's own 0–100% estimate of how well the quote supports the text. | Shown next to each AI badge; below 60% the model leaves the field blank. | "Uncertain → blank, never guessed." |
| **Provenance** | Where a piece of text came from. | Four states on every section: Doctor / AI draft / AI accepted / AI edited. | "Every word in the signed record carries who wrote it." |
| **AI draft → accepted / rejected / edited** | The doctor's decision on each AI section. | Amber → green (accepted), or cleared (rejected), or blue (edited). | "Nothing AI-written enters the record until a doctor accepts it. The review page refuses to sign with unaccepted drafts." |
| **Gap check / completeness score** | The AI reads the record and lists what a complete case sheet would normally include but this one doesn't. | Gaps panel; re-runs after every save. | "It checks the record, not the patient — it never suggests a diagnosis or a test." |
| **Streaming** | Receiving the AI's answer word by word instead of waiting for all of it. | The summary streams onto the review page. | — |
| **Tokens** | The units an AI reads and writes in (roughly ¾ of a word). Cost and limits are counted in tokens. | Logged per call in `ai_outputs`. | "A consultation costs a few paise in tokens." |
| **Thinking level / effort** | How much the model reasons before answering — more is slower and costlier. | Low for the gap check (fast), medium for structuring and summary. | — |
| **Rate limit** | The maximum calls per minute the provider allows, especially on free tiers. | The gap check waits 3 s after a save so it doesn't fire on every pause. | — |
| **Fallback** | What happens when the AI call fails, times out, or refuses. | The rule-based mock answers instead and the result is labelled "mock — fallback". | "If the network dies on stage, the same buttons keep working." |
| **Refusal** | When the model declines a request on safety grounds. | Handled explicitly; falls back. | — |
| **Web Speech API** | The browser's built-in speech-to-text. Free; supports Indian languages in Chrome. | Voice tab; language selector maps to hi-IN, ta-IN, etc. | "Zero-cost speech recognition; in production we'd swap in a medical-vocabulary model behind the same interface." |
| **Transcript** | The text of what was said, in the original language. | Stored with the consultation and shown next to the AI's draft. | — |

## 4. The two "seams" (say this — it's the architecture story)

| Term | Plain meaning | In Shruti | Say to judges |
|---|---|---|---|
| **Interface** | A contract listing what a piece of code must be able to do, without saying how. | `DataClient` (data) and `AiClient` (AI). | — |
| **Seam** | One place in the code where you can swap an implementation without touching anything else. | `lib/api/index.ts` and `lib/ai/index.ts` — one line each. | "We built the app against two interfaces. Swapping mock for Postgres, or Gemini for Claude, is one line. Nothing in the screens changed." |
| **Mock client / live client** | Two implementations of the same interface: fixed data vs the real service. | Mock = localStorage + rules; live = Supabase + Gemini. | — |

## 5. Clinical and regulatory terms judges may probe

| Term | Plain meaning | In Shruti |
|---|---|---|
| **OPD** | Out-patient department — patients who visit and go home the same day. | The setting we designed for. |
| **Case sheet / case taking** | The structured record a doctor writes for a consultation. | Six sections: chief complaint, HPI, past history, medications & allergies, examination, assessment & plan. |
| **Chief complaint** | The main problem, in the patient's words, with duration. | "Fever for 2 days, worse at night." |
| **HPI** | History of present illness — the story of the current problem. | — |
| **Vitals** | BP, pulse, temperature, breathing rate, SpO₂, height, weight. | Entered with units; out-of-range values flagged. |
| **BMI** | Weight ÷ height², a weight-to-height measure. | Computed, never typed; category shown. |
| **SpO₂** | Blood oxygen level, %. | Flagged below 95%. |
| **Carry-forward** | Copying stable history from the last visit so the doctor confirms rather than retypes. | Past history and medications, badged "From last visit". |
| **Sign & lock** | The doctor attests the note; it becomes read-only. | Enforced by a database trigger. |
| **Addendum** | A dated correction added below a signed note, never an edit. | Documented as the correction path (UI is future scope). |
| **DPDP Act 2023** | India's data-protection law: consent, purpose limitation, data rights. | Consent checkbox with timestamp at registration. |
| **ABHA / ABDM** | India's national health ID and the mission behind it. | Optional ABHA field on the patient; integration is roadmap. |
| **NMC registration number** | A doctor's licence number; must appear on prescriptions/notes. | Printed on every signed note. |
| **Medical device (regulatory)** | Software that suggests diagnoses or treatment is regulated like a device. | We deliberately don't — documentation only. |

## The three answers to have ready

**"Does it diagnose?"** No, by design. It structures what was said and flags what isn't documented. Diagnostic suggestions would make it a regulated medical device.

**"How do you know the AI didn't make something up?"** Three layers: every section must quote the transcript; the server drops any section whose quote isn't literally there; and nothing is saved as the doctor's until they accept it. You can see all three on screen.

**"Is any of this real?"** Real Postgres with row-level security, real login, real Gemini calls logged in an audit table, deployed on Vercel. The demo data is synthetic. Ask us to refresh the page — it's not local state.
