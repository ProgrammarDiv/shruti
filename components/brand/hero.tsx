import Image from "next/image";
import { Check, Mic, Radar, ShieldCheck } from "lucide-react";

// The login-page panel: a real consultation behind a petrol wash, the case
// sheet Shruti produces from it, and the three things that make the product
// different. Static.

export function Hero() {
  return (
    <div className="relative isolate flex min-h-full flex-col justify-between gap-6 p-10 text-white xl:p-12">
      {/* Backdrop: photograph, petrol wash for legibility, faint chart-paper grid */}
      <Image src="/photos/consult-clinic.jpg" alt="" fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="-z-30 object-cover object-[60%_35%]" />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(160deg,rgba(15,54,70,0.94)_0%,rgba(27,91,117,0.80)_50%,rgba(15,54,70,0.92)_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:28px_28px]" />

      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/60">Smart India Hackathon 2026</p>
        <h1 className="mt-3 max-w-[14ch] text-[44px] leading-[1.02] xl:text-[56px]">
          Speak the case.
          <br />
          <em className="font-normal italic text-white/85">Sign the record.</em>
        </h1>
        <p className="mt-4 max-w-[40ch] text-[15px] leading-relaxed text-white/80">
          The patient speaks Hindi. The record must be English. Shruti listens in the patient&apos;s language and drafts a structured case sheet — every AI word marked, nothing signed until the doctor says so.
        </p>
      </div>

      {/* What a consultation becomes */}
      <div className="grid gap-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
          <Mic className="size-5 shrink-0" />
          <p className="min-w-0 flex-1 truncate text-[15px]" lang="hi">
            दो दिन से बुखार है, रात में ज़्यादा बढ़ जाता है…
          </p>
          <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]">हिन्दी</span>
        </div>

        <div className="rounded-2xl bg-white p-4 text-foreground shadow-2xl shadow-black/40">
          <div className="mb-3 flex items-center justify-between border-b pb-2">
            <div>
              <div className="font-heading text-[15px] font-medium">Sunita Devi</div>
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

      <div>
        <ul className="grid gap-3 text-sm sm:grid-cols-3">
          <Feature icon={<Mic className="size-4" />} title="Six Indian languages" text="Hindi, Marathi, Tamil, Telugu, Bengali, English — spoken, not typed." />
          <Feature icon={<Radar className="size-4" />} title="Gap radar" text="Flags what a complete record would include. Never a diagnosis." />
          <Feature icon={<ShieldCheck className="size-4" />} title="Provenance" text="Every AI word is marked and must be accepted before signing." />
        </ul>
        <p className="mt-4 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/40">Photograph via Unsplash</p>
      </div>
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
    <li className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm">
      <div className="mb-1 flex items-center gap-2 font-medium">
        <span className="grid size-6 place-items-center rounded-md bg-white/15">{icon}</span>
        {title}
      </div>
      <p className="text-[12.5px] leading-snug text-white/70">{text}</p>
    </li>
  );
}
