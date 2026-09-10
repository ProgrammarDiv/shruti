"use client";

import { useState } from "react";
import { CircleAlert, Lock } from "lucide-react";
import { SECTION_LABELS, type SectionKey } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Step 2's minimal sign flow. Step 4 replaces this with the full review page
// (rendered note on letterhead, AI summary draft); the lock semantics stay.
export function SignDialog({
  open,
  onOpenChange,
  missing,
  doctorLine,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  missing: SectionKey[];
  doctorLine: string;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign the consultation.");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign and lock this consultation?</DialogTitle>
          <DialogDescription>
            Once signed, the note cannot be edited. Corrections are added as dated addenda so the original is always visible.
          </DialogDescription>
        </DialogHeader>

        {missing.length > 0 && (
          <div className="rounded-lg border border-warn/30 bg-warn-soft px-3 py-2 text-sm">
            <div className="flex items-center gap-1.5 font-medium text-warn">
              <CircleAlert className="size-4" />
              {missing.length} section{missing.length > 1 ? "s" : ""} not documented
            </div>
            <ul className="mt-1 ml-5 list-disc text-muted-foreground">
              {missing.map((k) => (
                <li key={k}>{SECTION_LABELS[k]}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-muted-foreground">You can still sign — this is a reminder, not a block.</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">Signing as {doctorLine}.</p>
        {error && <p className="text-sm text-flag">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Back to editing
          </Button>
          <Button onClick={confirm} disabled={busy}>
            <Lock data-icon="inline-start" />
            {busy ? "Signing…" : "Sign & lock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
