"use client";

import { Check, Mic, Radar, ShieldCheck } from "lucide-react";

// The login-page illustration: a spoken Hindi sentence becoming a structured,
// provenance-badged English case sheet. Built as HTML/CSS so it stays crisp,
// themeable and animatable without an image asset.

const BARS = [14, 26, 38, 22, 44, 30, 18, 36, 26, 40, 20, 32, 16, 28, 38, 22, 12];

export function Hero() {
  return (
    <div className="relative isolate flex h-full flex-col justify-between overflow-hidden p-10 text-white xl:p-14">
      {/* Backdrop: petrol gradient with a faint chart-paper grid */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,#0f3646_0%,#1b5b75_55%,#12475c_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute -top-32 -right-32 -z-10 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.14),transparent)]" />

      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/60">Smart India Hackathon 2026</p>
        <h1 className="mt-3 max-w-[14ch] text-4xl font-semibold leading-[1.05] tracking-tight xl:text-5xl">
          Speak the case.
          <br />
          Sign the record.
        </h1>
        <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-white/75">
          The patient speaks Hindi. The record must be English. Shruti listens in the patient&apos;s language and drafts a structured case sheet — every AI word marked, nothing signed until the doctor says so.
        </p>
      </div>

      {/* The illustration */}
      <div className="my-8 grid gap-3 xl:my-10">
        {/* Speech bubble with live waveform */}
        <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-white/15">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/20 [animation-duration:2.4s]" />
            <Mic className="relative size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex h-9 items-end gap-[3px]" aria-hidden>
              {BARS.map((h, i) => (
                <span key={i} className="wave-bar w-[3px] rounded-full bg-white/80" style={{ height: `${h}px`, animationDelay: `${i * 90}ms` }} />
              ))}
            </div>
            <p className="mt-1.5 truncate text-[15px]" lang="hi">
              दो दिन से बुखार है, रात में ज़्यादा बढ़ जाता है…
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]">हिन्दी</span>
        </div>

        {/* Arrow */}
        <div className="flex items-center gap-3 px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">
          <span className="h-px flex-1 bg-white/20" />
          structured by AI · verified by the doctor
          <span className="h-px flex-1 bg-white/20" />
        </div>

        {/* Case sheet card */}
        <div className="rounded-2xl bg-white p-4 text-foreground shadow-2xl shadow-black/30">
          <div className="mb-3 flex items-center justify-between border-b pb-2">
            <div>
              <div className="text-sm font-semibold">Sunita Devi</div>
              <div className="font-mono text-[10px] text-muted-foreground">46/F · SHR-2026-0141 · Follow-up</div>
            </div>
            <span className="rounded-full border border-good/30 bg-good-soft px-2 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-good">94% documented</span>
          </div>
          <Row label="Chief complaint" badge="accepted" text="Fever for 2 days, worse at night." />
          <Row label="History" badge="accepted" text="Associated headache and reduced appetite. No cough." />
          <Row label="Medications" badge="draft" text="Metformin — dose not stated. No known drug allergies." />
          <Row label="Examination" badge="doctor" text="BP 150/94 mmHg. CVS: S1 S2 normal, no murmur." />
        </div>
      </div>

      <ul className="grid gap-3 text-sm sm:grid-cols-3">
        <Feature icon={<Mic className="size-4" />} title="Six Indian languages" text="Hindi, Marathi, Tamil, Telugu, Bengali, English — spoken, not typed." />
        <Feature icon={<Radar className="size-4" />} title="Gap radar" text="Flags what a complete record would include. Never a diagnosis." />
        <Feature icon={<ShieldCheck className="size-4" />} title="Provenance" text="Every AI word is marked and must be accepted before signing." />
      </ul>
    </div>
  );
}

function Row({ label, badge, text }: { label: string; badge: "accepted" | "draft" | "doctor"; text: string }) {
  const cls = badge === "accepted" ? "border-prov-accepted/30 bg-prov-accepted-soft text-prov-accepted" : badge === "draft" ? "border-prov-ai/30 bg-prov-ai-soft text-prov-ai" : "border-prov-doctor/30 bg-prov-doctor-soft text-prov-doctor";
  const lbl = badge === "accepted" ? "AI · accepted" : badge === "draft" ? "AI draft" : "Doctor";
  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className="w-24 shrink-0 pt-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className="min-w-0 flex-1 text-[13px] leading-snug">{text}</div>
      <span className={`shrink-0 rounded-full border px-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.08em] ${cls}`}>
        {badge === "accepted" && <Check className="mr-0.5 inline size-2.5" />}
        {lbl}
      </span>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="rounded-xl bg-white/8 p-3 ring-1 ring-white/12">
      <div className="mb-1 flex items-center gap-2 font-medium">
        <span className="grid size-6 place-items-center rounded-md bg-white/15">{icon}</span>
        {title}
      </div>
      <p className="text-[12.5px] leading-snug text-white/65">{text}</p>
    </li>
  );
}
