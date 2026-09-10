import type { Language } from "@/lib/types";
import type { StructuredCase } from "@/lib/ai/types";

// The scripted demo consultation. Speaker A memorises the Hindi; the English
// version exists so the flow can be demonstrated in a noisy hall too.
export const SAMPLE_TRANSCRIPTS: Partial<Record<Language, string>> = {
  hi: "दो दिन से बुखार है, रात में ज़्यादा बढ़ जाता है। सिर में भी दर्द है। पहले से शुगर की बीमारी है, मेटफॉर्मिन ले रही हूँ। भूख कम लगती है। खाँसी नहीं है। किसी दवा से एलर्जी नहीं है।",
  en: "I have had fever for two days, it gets worse at night. I also have a headache. I am diabetic and I take metformin. My appetite is low. There is no cough. I am not allergic to any medicine.",
};

type FixtureSections = StructuredCase["sections"];

const HINDI_SECTIONS: FixtureSections = {
  chief_complaint: {
    text: "Fever for 2 days, worse at night.",
    sourceQuote: "दो दिन से बुखार है, रात में ज़्यादा बढ़ जाता है",
    confidence: 0.94,
  },
  hpi: {
    text: "Fever for two days, rising at night. Associated headache and reduced appetite. No cough.",
    sourceQuote: "सिर में भी दर्द है। … भूख कम लगती है। खाँसी नहीं है।",
    confidence: 0.86,
  },
  past_history: {
    text: "Known diabetes mellitus.",
    sourceQuote: "पहले से शुगर की बीमारी है",
    confidence: 0.9,
  },
  medications: {
    text: "Metformin — dose and frequency not stated. No known drug allergies.",
    sourceQuote: "मेटफॉर्मिन ले रही हूँ … किसी दवा से एलर्जी नहीं है",
    confidence: 0.78,
  },
};

const ENGLISH_SECTIONS: FixtureSections = {
  chief_complaint: {
    text: "Fever for 2 days, worse at night.",
    sourceQuote: "I have had fever for two days, it gets worse at night",
    confidence: 0.95,
  },
  hpi: {
    text: "Fever for two days, rising at night. Associated headache and reduced appetite. No cough.",
    sourceQuote: "I also have a headache. … My appetite is low. There is no cough.",
    confidence: 0.88,
  },
  past_history: {
    text: "Known diabetes mellitus.",
    sourceQuote: "I am diabetic",
    confidence: 0.92,
  },
  medications: {
    text: "Metformin — dose and frequency not stated. No known drug allergies.",
    sourceQuote: "I take metformin. … I am not allergic to any medicine.",
    confidence: 0.8,
  },
};

const UNCLEAR = ["Metformin dose and frequency were not stated — left for the doctor to confirm.", "How long the headache has been present was not stated."];

// Matches a transcript to a fixture by content, not by exact string, so a
// slightly mis-heard live recording of the script still works.
export function matchFixture(transcript: string): { sections: FixtureSections; unclear: string[]; language: Language } | null {
  const t = transcript.toLowerCase();
  if (/बुखार/.test(t) && /मेटफ/.test(t)) return { sections: HINDI_SECTIONS, unclear: UNCLEAR, language: "hi" };
  if (/fever/.test(t) && /metformin/.test(t)) return { sections: ENGLISH_SECTIONS, unclear: UNCLEAR, language: "en" };
  return null;
}
