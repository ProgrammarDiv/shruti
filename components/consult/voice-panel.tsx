"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Sparkles, Play, CircleAlert, Check, X, Plus } from "lucide-react";
import { cn } from "cn";
import { LANGUAGE_LABELS, SECTION_LABELS, type Language, type SectionKey } from "@/lib/types";
import type { StructuredCase } from "@/lib/ai";
import { SAMPLE_TRANSCRIPTS } from "@/lib/ai/mock/fixtures";
import { isSpeechSupported, startRecognition, type Recognizer } from "@/lib/voice/speech";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface StructureOutcome {
  result: StructuredCase;
  applied: SectionKey[];
  skipped: SectionKey[]; // had doctor content already — offered as "append"
}

export function VoicePanel({
  language,
  onLanguageChange,
  transcript,
  onTranscriptChange,
  onStructure,
  structuring,
  outcome,
  draftCount,
  onAcceptAll,
  onRejectAll,
  onAppend,
}: {
  language: Language;
  onLanguageChange: (l: Language) => void;
  transcript: string;
  onTranscriptChange: (t: string) => void;
  onStructure: () => void;
  structuring: boolean;
  outcome: StructureOutcome | null;
  draftCount: number;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAppend: (key: SectionKey) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const recognizer = useRef<Recognizer | null>(null);
  const playTimer = useRef<number | undefined>(undefined);
  const supported = isSpeechSupported();

  // Recording timer.
  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [recording]);

  // Stop everything on unmount.
  useEffect(
    () => () => {
      recognizer.current?.stop();
      window.clearInterval(playTimer.current);
    },
    [],
  );

  function start() {
    setError(null);
    setSeconds(0);
    setInterim("");
    const rec = startRecognition({
      language,
      onFinal: (text) => onTranscriptChange((transcript ? transcript.trimEnd() + " " : "") + text),
      onInterim: setInterim,
      onError: (m) => {
        setError(m);
        setRecording(false);
      },
      onEnd: () => setRecording(false),
    });
    if (rec) {
      recognizer.current = rec;
      setRecording(true);
    }
  }

  function stop() {
    recognizer.current?.stop();
    recognizer.current = null;
    setRecording(false);
    setInterim("");
  }

  // "Use sample" streams the scripted transcript word by word — the L3 fallback
  // for a noisy hall, and the same path the live recogniser feeds.
  function playSample() {
    const sample = SAMPLE_TRANSCRIPTS[language] ?? SAMPLE_TRANSCRIPTS.en!;
    const words = sample.split(" ");
    let i = 0;
    let acc = "";
    setPlaying(true);
    onTranscriptChange("");
    window.clearInterval(playTimer.current);
    playTimer.current = window.setInterval(() => {
      acc += (i ? " " : "") + words[i];
      onTranscriptChange(acc);
      i += 1;
      if (i >= words.length) {
        window.clearInterval(playTimer.current);
        setPlaying(false);
      }
    }, 90);
  }

  const hasSample = language in SAMPLE_TRANSCRIPTS;

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Voice capture">
        <div className="mb-3">
          <Select value={language} onValueChange={(v) => onLanguageChange(v as Language)} disabled={recording}>
            <SelectTrigger className="w-full">
              <SelectValue>{LANGUAGE_LABELS[language]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LANGUAGE_LABELS) as Language[]).map((l) => (
                <SelectItem key={l} value={l}>
                  {LANGUAGE_LABELS[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {recording ? (
            <Button variant="destructive" className="flex-1" onClick={stop}>
              <Square data-icon="inline-start" className="fill-current" />
              Stop
              <span className="ml-1 font-mono text-xs tnum">{formatSeconds(seconds)}</span>
            </Button>
          ) : (
            <Button className="flex-1" onClick={start} disabled={!supported || playing}>
              <Mic data-icon="inline-start" />
              Start recording
            </Button>
          )}
          <Button variant="outline" onClick={playSample} disabled={recording || playing || !hasSample} title={hasSample ? "Play the scripted sample" : "No sample for this language"}>
            <Play data-icon="inline-start" />
            {playing ? "Playing…" : "Sample"}
          </Button>
        </div>

        {recording && (
          <div className="mt-3 flex items-center gap-2 text-xs text-flag">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-flag opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-flag" />
            </span>
            Listening in {LANGUAGE_LABELS[language].split(" · ")[0]}
          </div>
        )}
        {!supported && <p className="mt-2 text-xs text-muted-foreground">This browser has no speech recognition — use Chrome or Edge, or the sample.</p>}
        {error && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-flag">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </p>
        )}
      </Panel>

      <Panel title="Transcript" meta={transcript ? `${transcript.split(/\s+/).filter(Boolean).length} words` : undefined}>
        <div className="relative">
          <Textarea
            value={transcript}
            onChange={(e) => onTranscriptChange(e.target.value)}
            placeholder="What was said appears here, in the language it was spoken. You can edit it."
            className="min-h-28 text-sm leading-relaxed"
            readOnly={recording || playing}
            lang={language}
          />
          {interim && <div className="pointer-events-none absolute right-2.5 bottom-2 left-2.5 truncate text-sm italic text-muted-foreground">{interim}</div>}
        </div>
        <Button className="mt-2 w-full" onClick={onStructure} disabled={!transcript.trim() || structuring || recording || playing}>
          <Sparkles data-icon="inline-start" />
          {structuring ? "Structuring…" : "Structure with AI"}
        </Button>
        <p className="mt-1.5 text-[11px] text-muted-foreground">Sections are filled as amber drafts. Nothing is saved as the doctor&apos;s until it is accepted.</p>
      </Panel>

      {outcome && (
        <Panel title="AI result" meta={`${outcome.result.latencyMs} ms · ${outcome.result.model}`}>
          <ul className="flex flex-col gap-1">
            {(Object.keys(outcome.result.sections) as SectionKey[]).map((k) => {
              const sec = outcome.result.sections[k]!;
              const applied = outcome.applied.includes(k);
              return (
                <li key={k} className="flex items-start gap-2">
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", applied ? "bg-prov-ai" : "bg-border")} />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{SECTION_LABELS[k]}</span>
                    <span className="ml-1.5 font-mono text-[10px] text-muted-foreground tnum">{Math.round(sec.confidence * 100)}%</span>
                    {!applied && (
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        Already documented — not overwritten.
                        <button type="button" onClick={() => onAppend(k)} className="inline-flex items-center gap-0.5 text-primary underline underline-offset-2">
                          <Plus className="size-3" />
                          Append
                        </button>
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          {outcome.result.unclear.length > 0 && (
            <div className="mt-3 rounded-md border border-warn/30 bg-warn-soft px-2.5 py-2 text-xs">
              <div className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-warn">Left blank rather than guessed</div>
              <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
                {outcome.result.unclear.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          {draftCount > 0 && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="flex-1" onClick={onAcceptAll}>
                <Check data-icon="inline-start" />
                Accept all {draftCount}
              </Button>
              <Button size="sm" variant="outline" onClick={onRejectAll}>
                <X data-icon="inline-start" />
                Reject all
              </Button>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

function formatSeconds(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Panel({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card p-3.5 text-sm ring-1 ring-foreground/10">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{title}</h4>
        {meta && <span className="truncate text-[11px] text-muted-foreground">{meta}</span>}
      </div>
      {children}
    </div>
  );
}
