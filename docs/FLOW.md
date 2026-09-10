# Shruti — how a consultation flows through the system

One patient, one visit, start to finish: what the browser does, what the server does, what the database does, and where the AI comes in. Numbers match the stages you can point at on screen.

```
Browser (React)  ──cookie──▶  proxy.ts  ──▶  page / route handler  ──▶  Supabase (Postgres + Auth)
      │                                              │
      │  api.* (DataClient) ─────────────────────────┘  RLS: clinic_id = mine
      │
      └─ ai.* (AiClient) ──▶ POST /api/ai/* ──▶ provider (Gemini | Claude) ──▶ zod + quote check ──▶ ai_outputs log
                    └── on any failure ──▶ rule-based mock (same shape, labelled)
```

## 0 · Start-up: the app decides what mode it's in

When the server starts (locally or on Vercel) it reads the environment variables.

- `NEXT_PUBLIC_SUPABASE_URL` + key present → `lib/api/index.ts` exports the **Supabase** DataClient. Absent → the **localStorage mock** with seeded demo data.
- `NEXT_PUBLIC_AI_MODE=live` → `lib/ai/index.ts` exports the **live** AiClient (calls `/api/ai/*`). Otherwise the **rule-based mock**.

Nothing in the screens knows which one it got. Same interface, same buttons.

## 1 · A request arrives: the auth gate

Every request passes through `proxy.ts` first.

1. It reads the Supabase session cookie and asks Supabase "who is this?"
2. No user and the page isn't `/login` → redirect to `/login?next=…`. No user on an `/api/` call → `401 Not signed in`.
3. A user on `/login` → redirect to `/dashboard`.
4. Otherwise the request continues, with a refreshed cookie if the token was about to expire.

(In demo mode with no Supabase configured, the proxy does nothing and every page is open.)

## 2 · Login

1. The doctor types email and password (or clicks **Demo login**).
2. The browser calls Supabase Auth directly (`signInWithPassword`). Supabase compares against the stored password hash — we never see the password.
3. Supabase returns a session; the browser stores it as cookies.
4. `router.push("/dashboard")` — the proxy now lets it through.

## 3 · Dashboard

1. The page calls `api.getDashboard()`.
2. The Supabase client sends five small queries (today's consultations with their patients, the six most recent, counts for the week, drafts, signed scores). Row-level security silently adds `where clinic_id = my clinic` to each.
3. Rows come back snake_case; the DataClient maps them to the app's TypeScript types.
4. Stat tiles, today's queue and recent list render. The greeting uses the signed-in doctor's profile.

## 4 · Opening a patient and starting a consultation

1. `/patients/[id]` loads the patient and their consultations (`listConsultations`, newest first). Allergies render in the red strip; the last signed note feeds "Current medications" and "Last visit summary".
2. **Start consultation** → `api.startConsultation(patientId)`:
   - inserts a `consultations` row (visit type = follow-up if prior visits exist, language = the patient's preferred one);
   - inserts six `case_sections` rows, one per section;
   - **carry-forward**: if there is a signed prior note, its past history and medications are copied into the new rows with `carried_from` set — the doctor confirms rather than retypes;
   - computes an initial completeness score.
3. The browser navigates to `/consult/[id]`. Because the consultation is a draft, the page renders the **Workspace**.

## 5 · Typing in the workspace: autosave

1. Each keystroke updates local React state immediately (the screen never waits for the network).
2. The change is recorded in a pending map and a timer is (re)started — **800 ms** after typing stops, `flush()` runs.
3. `flush()` sends one `api.saveSection()` per changed section — an **upsert** on `(consultation_id, section_key)`, so repeating it can't create duplicates. Editing AI text changes its provenance to `ai_edited`; editing carried-forward text makes it the doctor's own.
4. After saving, the server-side completeness score is recomputed and the chief complaint is copied to the consultation for lists.
5. The patient bar shows *Unsaved → Saving… → Saved 9:41 am*. Blur, `Ctrl+S`, and leaving the page also flush. If a save fails it retries in 3 s.
6. **3 s after a successful save**, the gap check runs (stage 9).

## 6 · Vitals

1. Each field is text while typing; `parseVitals()` turns it into numbers and checks the physically possible range.
2. Impossible values (pulse 700) stay on screen with an error and are simply left out of the save — they never block the other fields.
3. Normal-range flags (BP ≥ 140/90, SpO₂ < 95) colour the field amber. BMI is computed live in the browser and, on save, by a **generated column** in Postgres, so both always agree.

## 7 · Voice

1. The Voice tab uses the browser's **Web Speech API** with the consultation's language (`hi-IN`, `ta-IN`…). Audio never touches our server.
2. Final phrases are appended to the transcript; interim words show in grey. **Sample** plays the scripted transcript instead — same path, no microphone.
3. The transcript is saved to `consultations.transcript` one second after it stops changing.

## 8 · Structure with AI

1. The browser calls `ai.structure({ transcript, language, patient })`. In live mode this is `POST /api/ai/structure` — with the session cookie, so the proxy lets it through.
2. The route handler validates the body with **zod** (bad input → 400).
3. `provider()` picks Gemini or Claude by which key exists. The frozen system prompt ("record only what was said; never diagnose; quote your source") plus the transcript go to the model in **JSON mode**.
4. The reply is validated against the output schema (retried once if malformed).
5. **Quote verification**: for every section the model filled, the server checks that its `source_quote` is literally in the transcript. If not, the section is dropped and a note is added to "left blank rather than guessed".
6. The call is logged to `ai_outputs` (model, latency, tokens, output).
7. The browser receives the sections and fills **only empty ones** as amber `ai_draft` with the quote and confidence attached. Sections the doctor already wrote are offered as **Append**, never overwritten. Then autosave (stage 5) persists them.
8. If anything in 2–6 fails, times out or is refused, the live client calls the mock instead and the result is labelled "mock — fallback".

## 9 · Accept, reject, edit; the gap check

1. **Accept** sets `source = ai_accepted`; **Reject** clears the section back to `doctor`; typing sets `ai_edited`. Each is a normal save.
2. The gap check (`POST /api/ai/gaps`, thinking level low) sends the current case sheet and vitals. The model returns up to five *documentation* observations — "BP is raised but no cardiovascular examination is documented" — a score, and strengths. Never a diagnosis.
3. The score is written to `consultations.completeness_score`; the ring in the patient bar and the Gaps tab update. Clicking a gap scrolls to that section.

## 10 · Review & sign

1. **Review & sign** (or `Ctrl+Enter`) flushes any pending saves, then navigates to `/consult/[id]/review`.
2. The page renders the whole note as a document on clinic letterhead (`NoteDocument`) and runs one gap check for the checklist.
3. **Generate summary** → `POST /api/ai/summary`. The route handler **streams** the model's text word by word; the page shows it arriving as an amber draft. The prompt forbids adding anything not in the note and attributes the assessment to the doctor. **Accept** saves it (`setSummary`); Discard clears it.
4. The **Before you sign** checklist: any section still `ai_draft` is a **hard block** — Sign stays disabled. Undocumented sections and open gaps are reminders only.
5. The doctor ticks the attestation and clicks **Sign & lock** → `api.signConsultation()` sets `status = signed`, `is_locked = true`, `signed_at = now`.
6. From now on a Postgres **trigger** raises an error on any UPDATE to that consultation or its sections and vitals. The UI matches — no edit path exists.
7. Redirect to `/consult/[id]`, which now renders the locked read view: letterhead, provenance badges, summary, "Electronically signed by Dr. Anjali Rao".

## 11 · Afterwards

- The patient's timeline shows the new visit on top; "Current medications" and "Last visit summary" now come from it.
- The dashboard's recent list and average completeness update on next load.
- **Print** on the signed view strips the app chrome and prints the note as a plain document.
- The next visit for this patient starts at stage 4 with carry-forward from this note.

## What can fail, and what happens

| Failure | What the user sees |
|---|---|
| Network drops mid-typing | Text stays on screen; "Not saved — retrying"; a warning if they try to leave |
| AI key missing / provider down / rate-limited / refusal / timeout | Same buttons, same screens, result labelled "mock — fallback" |
| Microphone blocked or not HTTPS | Clear message; **Sample** and typing still work |
| Model returns a section with an invented quote | Server drops it and says so in the result panel |
| Someone tries to edit a signed note | Database refuses; the UI never offered the edit |
| Another clinic's user | Row-level security returns nothing — not even an error to fish from |
