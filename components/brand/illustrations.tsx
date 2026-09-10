import { cn } from "cn";

// Flat, static illustrations drawn in the app's palette. No animation.
// Each takes className for sizing; colours come from theme tokens unless the
// scene is meant for the dark hero panel.

type P = { className?: string };

// A doctor and a patient at a desk; the patient speaks Hindi, the tablet
// between them shows the structured case sheet. For the dark hero panel.
export function ConsultScene({ className }: P) {
  return (
    <svg viewBox="0 0 560 320" className={cn("h-auto w-full", className)} role="img" aria-label="A doctor listening to a patient who is speaking in Hindi, with the case sheet forming on a tablet between them">
      {/* floor / desk */}
      <rect x="0" y="236" width="560" height="84" rx="12" fill="rgba(255,255,255,0.10)" />
      <rect x="40" y="222" width="480" height="18" rx="9" fill="rgba(255,255,255,0.22)" />

      {/* speech bubble */}
      <g>
        <rect x="318" y="26" width="222" height="66" rx="16" fill="#fff" />
        <path d="M372 92l-14 22 32-22z" fill="#fff" />
        <text x="429" y="62" textAnchor="middle" fontSize="19" fontWeight="600" fill="#12475C">
          दो दिन से बुखार है…
        </text>
        <text x="429" y="82" textAnchor="middle" fontSize="10" fontFamily="ui-monospace, monospace" letterSpacing="1.5" fill="#5B8FA6">
          HINDI
        </text>
      </g>

      {/* doctor (left) */}
      <g>
        <path d="M116 226c0-42 22-64 50-64s50 22 50 64z" fill="#F7FBFC" />
        <path d="M150 162h32l-6 28h-20z" fill="#DCE8EE" />
        <circle cx="166" cy="118" r="32" fill="#F0CDB0" />
        <path d="M134 112c2-24 16-38 34-38s30 12 32 36c-10-10-22-14-34-14s-24 4-32 16z" fill="#2C2A33" />
        {/* stethoscope */}
        <path d="M150 168c0 22 8 34 16 34s16-12 16-34" fill="none" stroke="#1B5B75" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="166" cy="206" r="7" fill="#1B5B75" />
        <circle cx="166" cy="206" r="3" fill="#F7FBFC" />
        {/* badge */}
        <rect x="128" y="186" width="20" height="10" rx="2" fill="#1B5B75" />
        {/* arm on desk */}
        <path d="M200 200c14 6 28 12 42 18" stroke="#F0CDB0" strokeWidth="14" strokeLinecap="round" />
      </g>

      {/* patient (right) */}
      <g>
        <path d="M344 226c0-42 22-64 50-64s50 22 50 64z" fill="#E9B44C" />
        <circle cx="394" cy="120" r="30" fill="#D9A27A" />
        <path d="M364 116c0-24 14-40 30-40s30 16 30 40c-6-14-16-20-30-20s-24 6-30 20z" fill="#3B2A24" />
        <path d="M424 112c6 18 8 34 4 48" stroke="#3B2A24" strokeWidth="6" strokeLinecap="round" />
        <path d="M364 112c-6 18-8 34-4 48" stroke="#3B2A24" strokeWidth="6" strokeLinecap="round" />
        {/* dupatta */}
        <path d="M352 190c14-12 30-18 42-18s28 6 42 18" fill="none" stroke="#B23A2E" strokeWidth="8" strokeLinecap="round" opacity="0.9" />
      </g>

      {/* tablet with the case sheet */}
      <g>
        <rect x="236" y="150" width="96" height="74" rx="8" fill="#0F3646" />
        <rect x="242" y="156" width="84" height="62" rx="5" fill="#fff" />
        <rect x="250" y="164" width="30" height="5" rx="2.5" fill="#1B5B75" />
        <rect x="250" y="176" width="66" height="4" rx="2" fill="#C9D6DB" />
        <rect x="250" y="185" width="58" height="4" rx="2" fill="#C9D6DB" />
        <rect x="250" y="194" width="62" height="4" rx="2" fill="#FBEFD7" stroke="#E0A24A" strokeWidth="0.5" />
        <rect x="250" y="203" width="46" height="4" rx="2" fill="#C9D6DB" />
        <circle cx="314" cy="167" r="7" fill="#3D6A48" />
        <path d="M310.5 167l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* sound arcs from patient to tablet */}
      <g fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.55">
        <path d="M352 150a26 26 0 0 0 0 34" />
        <path d="M340 142a40 40 0 0 0 0 50" />
      </g>
    </svg>
  );
}

// Six Indian languages as a cluster of speech bubbles.
export function LanguageMosaic({ className }: P) {
  const bubbles: Array<[number, number, number, string, number, string]> = [
    [72, 70, 48, "हिन्दी", 20, "var(--accent)"],
    [180, 50, 40, "मराठी", 17, "var(--good-soft)"],
    [270, 92, 44, "தமிழ்", 17, "var(--warn-soft)"],
    [104, 156, 42, "తెలుగు", 17, "var(--prov-edited-soft)"],
    [206, 142, 38, "বাংলা", 17, "var(--flag-soft)"],
    [292, 176, 30, "English", 12, "var(--muted)"],
  ];
  return (
    <svg viewBox="0 0 340 220" className={cn("h-auto w-full", className)} role="img" aria-label="Speech bubbles in Hindi, Marathi, Tamil, Telugu, Bengali and English">
      {bubbles.map(([x, y, r, label, fs, fill], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill={fill} />
          <path d={`M${x - r * 0.35} ${y + r * 0.85} l-8 16 22-10z`} fill={fill} />
          <text x={x} y={y + fs * 0.35} textAnchor="middle" fontSize={fs} fontWeight="600" fill="var(--ink)">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// Empty waiting area: chairs and a clipboard on the wall.
export function EmptyQueue({ className }: P) {
  return (
    <svg viewBox="0 0 320 180" className={cn("h-auto w-full", className)} role="img" aria-label="An empty clinic waiting area">
      <rect x="0" y="140" width="320" height="6" rx="3" fill="var(--rule)" />
      {[40, 130, 220].map((x) => (
        <g key={x} fill="var(--accent)" stroke="var(--primary)" strokeWidth="2">
          <rect x={x} y="70" width="60" height="44" rx="8" />
          <rect x={x + 4} y="110" width="52" height="12" rx="6" />
          <path d={`M${x + 12} 122v18M${x + 48} 122v18`} stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
      <g>
        <rect x="128" y="18" width="64" height="40" rx="5" fill="var(--surface)" stroke="var(--rule-strong)" strokeWidth="2" />
        <rect x="150" y="12" width="20" height="10" rx="3" fill="var(--primary)" />
        <rect x="138" y="30" width="40" height="4" rx="2" fill="var(--rule-strong)" />
        <rect x="138" y="40" width="30" height="4" rx="2" fill="var(--rule-strong)" />
      </g>
    </svg>
  );
}

// A case sheet with a SIGNED stamp and a stethoscope resting on it.
export function SignedRecord({ className }: P) {
  return (
    <svg viewBox="0 0 320 200" className={cn("h-auto w-full", className)} role="img" aria-label="A signed case sheet with a stethoscope">
      <rect x="70" y="18" width="150" height="170" rx="8" fill="var(--surface)" stroke="var(--rule-strong)" strokeWidth="2" />
      <rect x="120" y="10" width="50" height="16" rx="5" fill="var(--primary)" />
      <rect x="86" y="44" width="70" height="7" rx="3.5" fill="var(--primary)" />
      {[62, 76, 90, 104, 118].map((y, i) => (
        <rect key={y} x="86" y={y} width={i % 2 ? 90 : 118} height="5" rx="2.5" fill="var(--rule-strong)" />
      ))}
      <rect x="86" y="132" width="60" height="5" rx="2.5" fill="var(--prov-ai)" opacity="0.6" />
      {/* stamp */}
      <g transform="rotate(-12 178 150)">
        <circle cx="178" cy="150" r="30" fill="none" stroke="var(--good)" strokeWidth="3" />
        <circle cx="178" cy="150" r="24" fill="none" stroke="var(--good)" strokeWidth="1.5" />
        <text x="178" y="154" textAnchor="middle" fontSize="11" fontWeight="700" letterSpacing="2" fill="var(--good)" fontFamily="ui-monospace, monospace">
          SIGNED
        </text>
      </g>
      {/* stethoscope */}
      <path d="M232 30c26 0 40 22 40 50s-16 46-38 46" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
      <path d="M236 126c-10 0-18 8-18 18s8 18 18 18" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="236" cy="162" r="10" fill="var(--primary)" />
      <circle cx="236" cy="162" r="4" fill="var(--surface)" />
      <circle cx="232" cy="30" r="5" fill="var(--primary)" />
    </svg>
  );
}

// A microphone with sound arcs — static.
export function MicPicture({ className }: P) {
  return (
    <svg viewBox="0 0 120 120" className={cn("h-auto w-full", className)} role="img" aria-label="A microphone">
      <circle cx="60" cy="60" r="56" fill="var(--accent)" />
      <rect x="48" y="24" width="24" height="44" rx="12" fill="var(--primary)" />
      <path d="M38 56a22 22 0 0 0 44 0" fill="none" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 80v12M46 92h28" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" />
      <path d="M26 44a34 34 0 0 0 0 24M94 44a34 34 0 0 1 0 24" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
