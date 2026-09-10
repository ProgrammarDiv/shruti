"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { api } from "@/lib/api";
import { localCompleteness } from "@/lib/clinical";
import {
  SECTION_LABELS,
  SECTION_ORDER,
  type CaseSection,
  type Consultation,
  type Doctor,
  type Patient,
  type SectionKey,
  type SectionPatch,
  type VitalsInput,
} from "@/lib/types";
import { PatientBar, type SaveState } from "./patient-bar";
import { SectionEditor } from "./section-editor";
import { VitalsForm, parseVitals, vitalsToText, type VitalsText } from "./vitals-form";
import { ContextPanel } from "./context-panel";
import { SignDialog } from "./sign-dialog";
import { CompletenessRing } from "./status-badge";

const AUTOSAVE_MS = 800;

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

  // ---- autosave engine ----
  // Pending changes live in refs so the flush function is stable and can be
  // called from timers, blur handlers and keyboard shortcuts alike.
  const pendingSections = useRef(new Map<SectionKey, SectionPatch>());
  const pendingVitals = useRef<VitalsInput | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const flushing = useRef(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(undefined);

  // Retries and follow-up flushes go through this ref so `flush` needn't
  // reference itself inside its own definition.
  const flushRef = useRef<(() => Promise<void>) | undefined>(undefined);

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
    } catch {
      setSaveState("error");
      timer.current = window.setTimeout(() => void flushRef.current?.(), 3000);
    } finally {
      flushing.current = false;
      // Anything typed while we were saving goes out on the next tick.
      if (pendingSections.current.size > 0 || pendingVitals.current) timer.current = window.setTimeout(() => void flushRef.current?.(), AUTOSAVE_MS);
    }
  }, [id]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const schedule = useCallback(() => {
    setSaveState("dirty");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), AUTOSAVE_MS);
  }, [flush]);

  function updateSection(key: SectionKey, content: string) {
    setSections((prev) => {
      const s = prev[key];
      // Editing AI-written text makes it "AI · edited"; carried-forward text
      // becomes the doctor's own once touched.
      const source = s.source === "doctor" ? "doctor" : "ai_edited";
      const patch: SectionPatch = { content, source, carriedFrom: undefined };
      pendingSections.current.set(key, patch);
      return { ...prev, [key]: { ...s, ...patch, updatedAt: new Date().toISOString() } };
    });
    schedule();
  }

  function updateVitals(next: VitalsText) {
    setVitalsText(next);
    // Physically impossible values stay on screen with an error and are simply
    // left out of the save — they never block the fields that are fine.
    pendingVitals.current = parseVitals(next).input;
    schedule();
  }

  // Ctrl+S saves now, Ctrl+Enter opens sign, Alt+↑/↓ move between sections.
  // (Alt+←/→ is browser back/forward on Windows, so it's not used.)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flush();
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
  }, [flush]);

  // Warn before leaving with unsaved edits; flush on unmount as a last resort.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (pendingSections.current.size > 0 || pendingVitals.current) e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void flush();
    };
  }, [flush]);

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

  // Live completeness from local state — no need to wait for the server.
  const completeness = useMemo(() => {
    const { input } = parseVitals(vitalsText);
    return localCompleteness({ ...initial, sections: Object.values(sections), vitals: Object.keys(input).length ? { ...input, recordedAt: "" } : undefined });
  }, [initial, sections, vitalsText]);

  const missing = SECTION_ORDER.filter((k) => !sections[k].content.trim());

  async function sign() {
    await flush();
    await api.signConsultation(id);
    setSignOpen(false);
    onSigned();
  }

  return (
    <>
      <PatientBar patient={patient} consultation={initial} completeness={completeness} saveState={saveState} lastSavedAt={lastSavedAt} onSign={() => setSignOpen(true)} />

      <div className="grid gap-5 lg:grid-cols-[188px_minmax(0,1fr)_300px]">
        {/* Left rail — section navigation with completeness ticks */}
        <nav className="hidden lg:block">
          <div className="sticky top-[88px] flex flex-col gap-0.5">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Sections</span>
              <CompletenessRing value={completeness} size={26} />
            </div>
            <RailItem label="Vitals" active={activeKey === "vitals"} filled={Object.keys(parseVitals(vitalsText).input).length > 0} onClick={() => jumpTo("vitals")} />
            {SECTION_ORDER.map((key, i) => (
              <RailItem key={key} n={i + 1} label={SECTION_LABELS[key]} active={activeKey === key} filled={!!sections[key].content.trim()} onClick={() => jumpTo(key)} />
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
          <VitalsForm text={vitalsText} previous={lastSigned?.vitals} onChange={updateVitals} onBlur={() => void flush()} />
          {SECTION_ORDER.map((key) => (
            <SectionEditor
              key={key}
              section={sections[key]}
              active={activeKey === key}
              onChange={(content) => updateSection(key, content)}
              onBlur={() => void flush()}
              onFocus={() => setActiveKey(key)}
            />
          ))}
          <div className="h-24" />
        </div>

        {/* Right — context, voice, gaps */}
        <aside className="lg:sticky lg:top-[88px] lg:self-start">
          <ContextPanel patient={patient} consultation={initial} lastSigned={lastSigned} sections={sections} onJump={jumpTo} />
        </aside>
      </div>

      <SignDialog open={signOpen} onOpenChange={setSignOpen} missing={missing} doctorLine={`${doctor.fullName}, ${doctor.qualification} · Reg. ${doctor.regNumber}`} onConfirm={sign} />
    </>
  );
}

function RailItem({ n, label, active, filled, onClick }: { n?: number; label: string; active: boolean; filled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
        active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className={cn("grid size-4 shrink-0 place-items-center rounded-full border text-[9px] font-mono", filled ? "border-good bg-good text-white" : "border-border")}>{filled ? "✓" : n ?? ""}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
