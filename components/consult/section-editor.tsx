"use client";

import { Check, X, Quote } from "lucide-react";
import { cn } from "cn";
import { SECTION_LABELS, type CaseSection } from "@/lib/types";
import { ProvenanceBadge } from "@/components/consult/status-badge";
import { Button } from "@/components/ui/button";
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
  onAccept,
  onReject,
}: {
  section: CaseSection;
  active: boolean;
  onChange: (content: string) => void;
  onBlur: () => void;
  onFocus: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const filled = section.content.trim().length > 0;
  const isDraft = section.source === "ai_draft";
  const fromAi = section.source !== "doctor" && !!section.sourceQuote;

  return (
    <section
      id={`section-${section.key}`}
      data-section-key={section.key}
      className={cn(
        "scroll-mt-28 rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow",
        active && "ring-2 ring-primary/40",
        isDraft && "ring-2 ring-prov-ai/50",
      )}
    >
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className={cn("size-2 rounded-full", filled ? "bg-good" : "bg-border")} aria-hidden />
        <h3 className="text-sm font-semibold">{SECTION_LABELS[section.key]}</h3>
        {filled && <ProvenanceBadge source={section.source} carried={!!section.carriedFrom} />}
        {section.carriedFrom && <span className="text-xs text-muted-foreground">— please confirm or edit</span>}
        {fromAi && section.aiConfidence !== undefined && (
          <span className="font-mono text-[10px] text-muted-foreground tnum" title="Model confidence">
            {Math.round(section.aiConfidence * 100)}%
          </span>
        )}
        {isDraft && (
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="xs" onClick={onAccept} title="Accept this draft as documented">
              <Check data-icon="inline-start" />
              Accept
            </Button>
            <Button size="xs" variant="outline" onClick={onReject} title="Discard this draft">
              <X data-icon="inline-start" />
              Reject
            </Button>
          </div>
        )}
      </div>

      <div className="px-3 pb-3">
        <Textarea
          data-section-key={section.key}
          value={section.content}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={PLACEHOLDERS[section.key]}
          className={cn(
            "min-h-20 resize-none border-transparent bg-transparent px-1.5 leading-relaxed shadow-none focus-visible:border-transparent focus-visible:ring-0",
            section.carriedFrom && "bg-prov-edited-soft/40",
            isDraft && "bg-prov-ai-soft/50",
          )}
          spellCheck={false}
        />
        {fromAi && (
          <details className="mt-1 px-1.5 text-xs text-muted-foreground">
            <summary className="inline-flex cursor-pointer items-center gap-1 select-none hover:text-foreground">
              <Quote className="size-3" />
              Source in transcript
            </summary>
            <blockquote className="mt-1 border-l-2 border-prov-ai/40 pl-2 italic leading-relaxed">{section.sourceQuote}</blockquote>
          </details>
        )}
      </div>
    </section>
  );
}
