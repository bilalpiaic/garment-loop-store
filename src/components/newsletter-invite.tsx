"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "garmentloop-atelier-invite-v1";

export function NewsletterInvite() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), 9000);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss(permanent: boolean) {
    setOpen(false);
    if (permanent) {
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Enter a valid email.");
      return;
    }
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    setSubmitting(false);
    toast.success("You’re on the atelier list. Welcome to the loop.");
    dismiss(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss(true);
        else setOpen(true);
      }}
    >
      <DialogContent className="atelier-panel gap-0 overflow-hidden border-champagne/30 p-0 sm:max-w-md">
        <div className="bg-[linear-gradient(135deg,var(--ink)_0%,var(--olive-deep)_55%,#2a4034_100%)] px-6 py-7 text-cream">
          <p className="text-[11px] uppercase tracking-[0.24em] text-champagne">Private invite</p>
          <DialogHeader className="mt-2 space-y-2 text-left">
            <DialogTitle className="font-serif text-3xl font-normal tracking-tight text-cream">
              Join the atelier list
            </DialogTitle>
            <DialogDescription className="text-cream/75">
              Early access to winter drops, care guides, and circular take-back launches — no spam,
              unsubscribe anytime.
            </DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 px-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="atelier-email">Email</Label>
            <Input
              id="atelier-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" className="btn-lux btn-shimmer h-11 flex-1" disabled={submitting}>
              {submitting ? "Saving…" : "Join the list"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              onClick={() => dismiss(true)}
            >
              Not now
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
