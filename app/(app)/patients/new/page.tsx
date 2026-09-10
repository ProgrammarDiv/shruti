"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { api } from "@/lib/api";
import { LANGUAGE_LABELS, type Gender, type Language, type NewPatient } from "@/lib/types";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

type Errors = Partial<Record<"fullName" | "ageYears" | "phone" | "consent", string>>;

export default function NewPatientPage() {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "save" | "consult">(null);
  const [errors, setErrors] = useState<Errors>({});

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<Language>("hi");
  const [bloodGroup, setBloodGroup] = useState<string>("");
  const [address, setAddress] = useState("");
  const [abha, setAbha] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyDraft, setAllergyDraft] = useState("");
  const [consent, setConsent] = useState(false);

  function validate(): NewPatient | null {
    const e: Errors = {};
    const ageNum = Number(age);
    if (fullName.trim().length < 2) e.fullName = "Enter the patient's name.";
    if (!age || Number.isNaN(ageNum) || ageNum < 0 || ageNum > 120) e.ageYears = "Age should be between 0 and 120.";
    if (phone.replace(/\D/g, "").length < 10) e.phone = "Enter a 10-digit phone number.";
    if (!consent) e.consent = "Consent is required before storing health information.";
    setErrors(e);
    if (Object.keys(e).length) return null;
    return {
      fullName: fullName.trim(),
      ageYears: ageNum,
      gender,
      phone: phone.trim(),
      preferredLanguage: language,
      bloodGroup: bloodGroup || undefined,
      address: address.trim() || undefined,
      abhaNumber: abha.trim() || undefined,
      allergies,
      consentGiven: true,
    };
  }

  async function submit(mode: "save" | "consult") {
    const input = validate();
    if (!input) return;
    setBusy(mode);
    try {
      const patient = await api.createPatient(input);
      if (mode === "consult") {
        const c = await api.startConsultation(patient.id);
        router.push(`/consult/${c.id}`);
      } else {
        router.push(`/patients/${patient.id}`);
      }
    } finally {
      setBusy(null);
    }
  }

  function addAllergy() {
    const v = allergyDraft.trim();
    if (v && !allergies.includes(v)) setAllergies([...allergies, v]);
    setAllergyDraft("");
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground" render={<Link href="/patients" />}>
        <ArrowLeft data-icon="inline-start" />
        Patients
      </Button>
      <PageHeader title="Register new patient" description="Only name, age and phone are required. Everything else can be added later." />

      <form
        className="grid gap-4 lg:grid-cols-[1fr_320px]"
        onSubmit={(e) => {
          e.preventDefault();
          submit("save");
        }}
      >
        <Card>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" error={errors.fullName} className="sm:col-span-2">
              <Input autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Sunita Devi" aria-invalid={!!errors.fullName} />
            </Field>

            <Field label="Age (years)" error={errors.ageYears} hint="Age is fine when the date of birth isn't known.">
              <Input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="46" aria-invalid={!!errors.ageYears} />
            </Field>

            <Field label="Gender">
              <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{GENDERS.find((g) => g.value === gender)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Phone" error={errors.phone}>
              <Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98450 12345" aria-invalid={!!errors.phone} />
            </Field>

            <Field label="Preferred language" hint="The language the consultation will be recorded in.">
              <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
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
            </Field>

            <Field label="Blood group">
              <Select value={bloodGroup} onValueChange={(v) => setBloodGroup(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{bloodGroup || <span className="text-muted-foreground">Not known</span>}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="ABHA number" hint="Optional — Ayushman Bharat Health Account ID.">
              <Input value={abha} onChange={(e) => setAbha(e.target.value)} placeholder="91-2345-6789-0123" className="font-mono" />
            </Field>

            <Field label="Address" className="sm:col-span-2">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Area, city" />
            </Field>

            <Field label="Allergies" hint="Press Enter after each one. These show in red on every screen for this patient." className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background p-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                {allergies.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-md border border-flag/30 bg-flag-soft px-2 py-0.5 text-xs font-medium text-flag">
                    {a}
                    <button type="button" onClick={() => setAllergies(allergies.filter((x) => x !== a))} aria-label={`Remove ${a}`} className="rounded hover:bg-flag/10">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={allergyDraft}
                  onChange={(e) => setAllergyDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addAllergy();
                    }
                  }}
                  onBlur={addAllergy}
                  placeholder={allergies.length ? "" : "Penicillin, sulpha, peanuts…"}
                  className="min-w-[160px] flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </Field>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card size="sm">
            <CardContent>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Consent · DPDP Act 2023</div>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
                <span>
                  The patient agrees that <span className="font-medium">Shruti Demo Clinic</span> may store their health information for the purpose of treatment.
                </span>
              </label>
              {errors.consent && <p className="mt-2 text-xs text-flag">{errors.consent}</p>}
              <p className="mt-3 text-xs text-muted-foreground">The date and time of consent are recorded with the patient record.</p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button type="button" size="lg" onClick={() => submit("consult")} disabled={busy !== null}>
              {busy === "consult" ? "Saving…" : "Save & start consultation"}
            </Button>
            <Button type="submit" variant="outline" size="lg" disabled={busy !== null}>
              {busy === "save" ? "Saving…" : "Save patient"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}

function Field({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-flag">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
