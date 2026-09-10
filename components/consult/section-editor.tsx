"use client";

import { cn } from "cn";
import { SECTION_LABELS, type CaseSection } from "@/lib/types";
import { ProvenanceBadge } from "@/components/consult/status-badge";
import { Textarea } from "@/components/ui/textarea";

const PLACEHOLDERS: Record<CaseSection["key"], string> = {
  chief_complaint: "What the patient came with, in their words, and for how long. e.g. Fever for 3 days, worse at night.",
  hpi: "The story of this problem — onset, course, associated symptoms, what makes it better or worse.",
  past_history: "Previous illnesses, surgeries, hospital admissions. Family history where relevant.",
  medications: "Current medicines with dose and frequency. Known drug allergies.",
  examination: "General and system-wise findings as examined. Record what was normal too.",
  plan: "Provisional and differential diagnosis, investigations ordered, treatment, advice, follow-up.",
};

export function SectionEditor({
  section,
  active,
  onChange,
  onBlur,
  onFocus,
  textareaRef,
}: {
  section: CaseSection;
  active: boolean;
  onChange: (content: string) => void;
  onBlur: () => void;
  onFocus: () => void;
  textareaRef?: (el: HTMLTextAreaElement | null) => void;
}) {
  const filled = section.content.trim().length > 0;
  return (
    <section
      id={`section-${section.key}`}
      data-section-key={section.key}
      className={cn(
        "scroll-mt-28 rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow",
        active && "ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className={cn("size-2 rounded-full", filled ? "bg-good" : "bg-border")} aria-hidden />
        <h3 className="text-sm font-semibold">{SECTION_LABELS[section.key]}</h3>
        {filled && <ProvenanceBadge source={section.source} carried={!!section.carriedFrom} />}
        {section.carriedFrom && <span className="text-xs text-muted-foreground">— please confirm or edit</span>}
      </div>
      <div className="px-3 pb-3">
        <Textarea
          ref={textareaRef}
          data-section-key={section.key}
          value={section.content}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={PLACEHOLDERS[section.key]}
          className={cn("min-h-20 resize-none border-transparent bg-transparent px-1.5 leading-relaxed shadow-none focus-visible:border-transparent focus-visible:ring-0", section.carriedFrom && "bg-prov-edited-soft/40")}
          spellCheck={false}
        />
      </div>
    </section>
  );
}
