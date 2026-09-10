import type { Language } from "@/lib/types";

// Thin wrapper over the browser's SpeechRecognition (Chrome/Edge). Free, zero
// setup, streams interim results, and speaks Indian language codes. It ships
// audio to the browser vendor — fine for a demo, replaced by a medical STT
// provider behind the same interface in production.

export const SPEECH_LOCALES: Record<Language, string> = {
  hi: "hi-IN",
  mr: "mr-IN",
  ta: "ta-IN",
  te: "te-IN",
  bn: "bn-IN",
  en: "en-IN",
};

// Minimal typings — the DOM lib doesn't ship these.
interface SRResultAlternative {
  transcript: string;
}
interface SRResult {
  isFinal: boolean;
  0: SRResultAlternative;
  length: number;
}
interface SREvent {
  resultIndex: number;
  results: ArrayLike<SRResult>;
}
interface SRErrorEvent {
  error: string;
}
interface SRInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SRConstructor = new () => SRInstance;

function getCtor(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechSupported(): boolean {
  return getCtor() !== null;
}

export interface Recognizer {
  stop(): void;
}

export function startRecognition(opts: {
  language: Language;
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): Recognizer | null {
  const Ctor = getCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = SPEECH_LOCALES[opts.language];
  rec.continuous = true;
  rec.interimResults = true;

  let stopped = false;

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const text = r[0].transcript;
      if (r.isFinal) opts.onFinal(text.trim());
      else interim += text;
    }
    opts.onInterim(interim.trim());
  };
  rec.onerror = (e) => {
    const map: Record<string, string> = {
      "not-allowed": "Microphone access was blocked. Allow it in the browser and try again.",
      "audio-capture": "No microphone was found.",
      network: "Speech recognition needs an internet connection.",
      "no-speech": "No speech was detected.",
      "language-not-supported": "This language isn't supported by the browser's recogniser.",
    };
    opts.onError(map[e.error] ?? `Speech recognition error: ${e.error}`);
  };
  rec.onend = () => {
    // Chrome ends continuous sessions on silence; restart until told to stop.
    if (!stopped) {
      try {
        rec.start();
        return;
      } catch {
        /* fall through */
      }
    }
    opts.onEnd();
  };

  try {
    rec.start();
  } catch (err) {
    opts.onError(err instanceof Error ? err.message : "Could not start recording.");
    return null;
  }

  return {
    stop() {
      stopped = true;
      rec.stop();
    },
  };
}
