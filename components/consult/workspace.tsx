"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { api } from "@/lib/api";
import { ai, type GapReport, type CaseSheetInput } from "@/lib/ai";
import { localCompleteness, computeBmi } from "@/lib/clinical";
import {
  SECTION_LABELS,
  SECTION_ORDER,
  type CaseSection,
  type Consultation,
  type Doctor,
  type Language,
  type Patient,
  type SectionKey,
  type SectionPatch,
  type VitalsInput,
} from "@/lib/types";
import { PatientBar, type SaveState } from "./patient-bar";
import { SectionEditor } from "./section-editor";
import { VitalsForm, parseVitals, vitalsToText, type VitalsText } from "./vitals-form";
import { ContextPanel, type PanelTab } from "./context-panel";
import { VoicePanel, type StructureOutcome } from "./voice-panel";
import { GapsPanel } from "./gaps-panel";
import { SignDialog } from "./sign-dialog";
import { CompletenessRing } from "./status-badge";

const AUTOSAVE_MS = 800;
const GAP_CHECK_MS = 1500;

export function Workspace({
  consultation: initial,
  patient,
  doctor,
  history,
  onSigned,
}: {
  consultation: Consultation;
  patient: Patient;
  doctor: Doctor;
  history: Consultation[];
  onSigned: () => void;
}) {
  const id = initial.id;
  const lastSigned = useMemo(() => history.find((c) => c.status === "signed" && c.id !== id), [history, id]);

  // ---- local editing state ----
  const [sections, setSections] = useState<Record<SectionKey, CaseSection>>(() => {
    const map = {} as Record<SectionKey, CaseSection>;
    for (const key of SECTION_ORDER) map[key] = initial.sections.find((s) => s.key === key) ?? { key, content: "", source: "doctor", updatedAt: initial.startedAt };
    return map;
  });
  const [vitalsText, setVitalsText] = useState<VitalsText>(() => vitalsToText(initial.vitals));
  const [activeKey, setActiveKey] = useState<SectionKey | "vitals">("chief_complaint");
  const [signOpen, setSignOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>(initial.transcript ? "voice" : "context");

  // ---- voice / AI state ----
  const [language, setLanguage] = useState<Language>(initial.languageUsed);
  const [transcript, setTranscript] = useState(initial.transcript ?? "");
  const [structuring, setStructuring] = useState(false);
  const [outcome, setOutcome] = useState<StructureOutcome | null>(null);
  const [gapReport, setGapReport] = useState<GapReport | null>(null);
  const [gapBusy, setGapBusy] = useState(false);

  // ---- autosave engine ----
  // Pending changes live in refs so the flush function is stable and can be
  // called from timers, blur handlers and keyboard shortcuts alike.
  const pendingSections = useRef(new Map<SectionKey, SectionPatch>());
  const pendingVitals = useRef<VitalsInput | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const transcriptTimer = useRef<number | undefined>(undefined);
  const gapTimer = useRef<number | undefined>(undefined);
  const flushing = useRef(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(undefined);

  // Latest state for callbacks that run from timers.
  const latest = useRef({ sections, vitalsText });
  useEffect(() => {
    latest.current = { sections, vitalsText };
  }, [sections, vitalsText]);

  // Retries, follow-up flushes and the post-save gap check go through refs so
  // `flush` needn't reference itself or a later-declared function.
  const flushRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const gapCheckRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const scheduleGapCheck = useCallback(() => {
    window.clearTimeout(gapTimer.current);
    gapTimer.current = window.setTimeout(() => void gapCheckRef.current?.(), GAP_CHECK_MS);
  }, []);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (flushing.current) return;
    if (pendingSections.current.size === 0 && !pendingVitals.current) return;

    flushing.current = true;
    setSaveState("saving");
    try {
      const entries = Array.from(pendingSections.current.entries());
      pendingSections.current.clear();
      for (const [key, patch] of entries) await api.saveSection(id, key, patch);

      if (pendingVitals.current) {
        const v = pendingVitals.current;
        pendingVitals.current = null;
        await api.saveVitals(id, v);
      }
      setSaveState("saved");
      setLastSavedAt(new Date().toISOString());
      scheduleGapCheck();
    } catch {
      setSaveState("error");
      timer.current = window.setTimeout(() => void flushRef.current?.(), 3000);
    } finally {
      flushing.current = false;
      // Anything typed while we were saving goes out on the next tick.
      if (pendingSections.current.size > 0 || pendingVitals.current) timer.current = window.setTimeout(() => void flushRef.current?.(), AUTOSAVE_MS);
    }
  }, [id, scheduleGapCheck]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const schedule = useCallback(() => {
    setSaveState("dirty");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flushRef.current?.(), AUTOSAVE_MS);
  }, []);

  // Apply a patch locally and queue it — the one write path for sections.
  const patchSection = useCallback(
    (key: SectionKey, patch: SectionPatch) => {
      setSections((prev) => ({ ...prev, [key]: { ...prev[key], ...patch, updatedAt: new Date().toISOString() } }));
      const merged = { ...(pendingSections.current.get(key) ?? {}), ...patch };
      pendingSections.current.set(key, merged);
      schedule();
    },
    [schedule],
  );

  function updateSection(key: SectionKey, content: string) {
    const s = latest.current.sections[key];
    // Editing AI-written text makes it "AI · edited"; carried-forward text
    // becomes the doctor's own once touched.
    const source = s.source === "doctor" ? "doctor" : "ai_edited";
    patchSection(key, { content, source, carriedFrom: undefined });
  }

  function updateVitals(next: VitalsText) {
    setVitalsText(next);
    // Physically impossible values stay on screen with an error and are simply
    // left out of the save — they never block the fields that are fine.
    pendingVitals.current = parseVitals(next).input;
    schedule();
  }

  // ---- AI: structure ----
  async function structureTranscript() {
    if (!transcript.trim()) return;
    setStructuring(true);
    try {
      await api.setTranscript(id, transcript);
      const result = await ai.structure({ transcript, language, patient: { ageYears: patient.ageYears, gender: patient.gender, allergies: patient.allergies } });
      const applied: SectionKey[] = [];
      const skipped: SectionKey[] = [];
      for (const key of SECTION_ORDER) {
        const out = result.sections[key];
        if (!out) continue;
        const current = latest.current.sections[key];
        // Only empty sections and earlier AI drafts are filled. Anything the
        // doctor wrote (or confirmed) is never overwritten — it's offered as an append.
        if (!current.content.trim() || current.source === "ai_draft") {
          patchSection(key, { content: out.text, source: "ai_draft", sourceQuote: out.sourceQuote, aiConfidence: out.confidence, carriedFrom: undefined });
          applied.push(key);
        } else {
          skipped.push(key);
        }
      }
      setOutcome({ result, applied, skipped });
      if (applied.length) {
        setActiveKey(applied[0]);
        document.getElementById(`section-${applied[0]}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    } finally {
      setStructuring(false);
    }
  }

  function appendStructured(key: SectionKey) {
    const out = outcome?.result.sections[key];
    if (!out) return;
    const current = latest.current.sections[key];
    patchSection(key, { content: `${current.content.trimEnd()}\n\n${out.text}`, source: "ai_edited", sourceQuote: out.sourceQuote, aiConfidence: out.confidence, carriedFrom: undefined });
    setOutcome((o) => (o ? { ...o, applied: [...o.applied, key], skipped: o.skipped.filter((k) => k !== key) } : o));
  }

  function acceptSection(key: SectionKey) {
    patchSection(key, { source: "ai_accepted" });
    void flushRef.current?.();
  }
  function rejectSection(key: SectionKey) {
    patchSection(key, { content: "", source: "doctor", sourceQuote: undefined, aiConfidence: undefined });
    void flushRef.current?.();
  }
  function acceptAll() {
    for (const key of SECTION_ORDER) if (latest.current.sections[key].source === "ai_draft") patchSection(key, { source: "ai_accepted" });
    void flushRef.current?.();
  }
  function rejectAll() {
    for (const key of SECTION_ORDER) if (latest.current.sections[key].source === "ai_draft") patchSection(key, { content: "", source: "doctor", sourceQuote: undefined, aiConfidence: undefined });
    void flushRef.current?.();
  }

  function changeTranscript(t: string) {
    setTranscript(t);
    window.clearTimeout(transcriptTimer.current);
    transcriptTimer.current = window.setTimeout(() => void api.setTranscript(id, t), 1000);
  }
  function changeLanguage(l: Language) {
    setLanguage(l);
    void api.setLanguage(id, l);
  }

  // ---- AI: gap check ----
  const runGapCheck = useCallback(async () => {
    const { sections: secs, vitalsText: vt } = latest.current;
    const { input } = parseVitals(vt);
    const hasContent = SECTION_ORDER.some((k) => secs[k].content.trim()) || Object.keys(input).length > 0;
    if (!hasContent) {
      setGapReport(null);
      return;
    }
    setGapBusy(true);
    try {
      const sheet: CaseSheetInput = {
        patient: { ageYears: patient.ageYears, gender: patient.gender, allergies: patient.allergies },
        sections: Object.fromEntries(SECTION_ORDER.map((k) => [k, secs[k].content])) as Record<SectionKey, string>,
        vitals: Object.keys(input).length ? { ...input, bmi: computeBmi(input.heightCm, input.weightKg) } : undefined,
      };
      const report = await ai.detectGaps(sheet);
      setGapReport(report);
      void api.setCompleteness(id, report.completenessScore);
    } finally {
      setGapBusy(false);
    }
  }, [id, patient.ageYears, patient.gender, patient.allergies]);

  useEffect(() => {
    gapCheckRef.current = runGapCheck;
  }, [runGapCheck]);

  // First check shortly after opening, if there's anything to check.
  useEffect(() => {
    const t = window.setTimeout(() => void gapCheckRef.current?.(), 400);
    return () => window.clearTimeout(t);
  }, []);

  // Ctrl+S saves now, Ctrl+Enter opens sign, Alt+↑/↓ move between sections.
  // (Alt+←/→ is browser back/forward on Windows, so it's not used.)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flushRef.current?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        setSignOpen(true);
      } else if (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        const areas = Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea[data-section-key]"));
        const i = areas.findIndex((a) => a === document.activeElement);
        const next = areas[Math.max(0, Math.min(areas.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))];
        next?.focus();
        next?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Warn before leaving with unsaved edits; flush on unmount as a last resort.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (pendingSections.current.size > 0 || pendingVitals.current) e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.clearTimeout(gapTimer.current);
      window.clearTimeout(transcriptTimer.current);
      void flushRef.current?.();
    };
  }, []);

  // Scroll-spy: the section whose top is closest below the sticky bar is active.
  useEffect(() => {
    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>("section[data-section-key]"));
        let current: string | null = null;
        for (const el of els) {
          if (el.getBoundingClientRect().top <= 150) current = el.dataset.sectionKey ?? null;
        }
        if (current) setActiveKey(current as SectionKey | "vitals");
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  function jumpTo(key: SectionKey | "vitals") {
    document.getElementById(`section-${key}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
    if (key !== "vitals") window.setTimeout(() => document.querySelector<HTMLTextAreaElement>(`textarea[data-section-key="${key}"]`)?.focus({ preventScroll: true }), 350);
  }

  // Completeness: the AI score once it exists, the local heuristic until then.
  const localScore = useMemo(() => {
    const { input } = parseVitals(vitalsText);
    return localCompleteness({ ...initial, sections: Object.values(sections), vitals: Object.keys(input).length ? { ...input, recordedAt: "" } : undefined });
  }, [initial, sections, vitalsText]);
  const completeness = gapReport?.completenessScore ?? localScore;

  const missing = SECTION_ORDER.filter((k) => !sections[k].content.trim());
  const draftCount = SECTION_ORDER.filter((k) => sections[k].source === "ai_draft").length;

  async function sign() {
    await flush();
    await api.signConsultation(id);
    setSignOpen(false);
    onSigned();
  }

  return (
    <>
      <PatientBar patient={patient} consultation={initial} completeness={completeness} saveState={saveState} lastSavedAt={lastSavedAt} onSign={() => setSignOpen(true)} />

      <div className="grid gap-5 lg:grid-cols-[188px_minmax(0,1fr)_320px]">
        {/* Left rail — section navigation with completeness ticks */}
        <nav className="hidden lg:block">
          <div className="sticky top-[88px] flex flex-col gap-0.5">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Sections</span>
              <CompletenessRing value={completeness} size={26} />
            </div>
            <RailItem label="Vitals" active={activeKey === "vitals"} filled={Object.keys(parseVitals(vitalsText).input).length > 0} onClick={() => jumpTo("vitals")} />
            {SECTION_ORDER.map((key, i) => (
              <RailItem key={key} n={i + 1} label={SECTION_LABELS[key]} active={activeKey === key} filled={!!sections[key].content.trim()} draft={sections[key].source === "ai_draft"} onClick={() => jumpTo(key)} />
            ))}
            <div className="mt-4 space-y-1 px-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
              <div><kbd>Alt ↑↓</kbd> next section</div>
              <div><kbd>Ctrl S</kbd> save now</div>
              <div><kbd>Ctrl ↵</kbd> review &amp; sign</div>
            </div>
          </div>
        </nav>

        {/* Centre — vitals then the case sections, all on one surface */}
        <div className="flex min-w-0 flex-col gap-3">
          <VitalsForm text={vitalsText} previous={lastSigned?.vitals} onChange={updateVitals} onBlur={() => void flushRef.current?.()} />
          {SECTION_ORDER.map((key) => (
            <SectionEditor
              key={key}
              section={sections[key]}
              active={activeKey === key}
              onChange={(content) => updateSection(key, content)}
              onBlur={() => void flushRef.current?.()}
              onFocus={() => setActiveKey(key)}
              onAccept={() => acceptSection(key)}
              onReject={() => rejectSection(key)}
            />
          ))}
          <div className="h-24" />
        </div>

        {/* Right — context, voice, gaps */}
        <aside className="lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-100px)] lg:self-start lg:overflow-y-auto">
          <ContextPanel
            patient={patient}
            lastSigned={lastSigned}
            tab={tab}
            onTabChange={setTab}
            gapCount={gapReport?.gaps.length ?? missing.length}
            voice={
              <VoicePanel
                language={language}
                onLanguageChange={changeLanguage}
                transcript={transcript}
                onTranscriptChange={changeTranscript}
                onStructure={() => void structureTranscript()}
                structuring={structuring}
                outcome={outcome}
                draftCount={draftCount}
                onAcceptAll={acceptAll}
                onRejectAll={rejectAll}
                onAppend={appendStructured}
              />
            }
            gaps={<GapsPanel report={gapReport} busy={gapBusy} fallbackScore={localScore} onRun={() => void runGapCheck()} onJump={jumpTo} />}
          />
        </aside>
      </div>

      <SignDialog open={signOpen} onOpenChange={setSignOpen} missing={missing} doctorLine={`${doctor.fullName}, ${doctor.qualification} · Reg. ${doctor.regNumber}`} onConfirm={sign} />
    </>
  );
}

function RailItem({ n, label, active, filled, draft, onClick }: { n?: number; label: string; active: boolean; filled: boolean; draft?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
        active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full border font-mono text-[9px]",
          draft ? "border-prov-ai bg-prov-ai-soft text-prov-ai" : filled ? "border-good bg-good text-white" : "border-border",
        )}
      >
        {draft ? "AI" : filled ? "✓" : (n ?? "")}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
