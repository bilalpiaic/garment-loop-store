"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  analyticsConfigured,
  readConsent,
  writeConsent,
  type ConsentValue,
} from "@/lib/analytics";

function subscribeConsent(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("garmentloop:consent", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("garmentloop:consent", handler);
    window.removeEventListener("storage", handler);
  };
}

function getConsentSnapshot(): ConsentValue | null {
  return readConsent();
}

function getConsentServerSnapshot(): null {
  return null;
}

function subscribeMounted(onStoreChange: () => void) {
  // Client-only flag: no subscription needed after first paint.
  void onStoreChange;
  return () => {};
}

export function ConsentBanner() {
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const hasPixels = analyticsConfigured();
  // Wait until client mount so SSR/hydration stay banner-free; then show if undecided.
  const visible = mounted && consent === null;

  if (!visible) return null;

  function accept() {
    writeConsent("accepted");
  }

  function decline() {
    writeConsent("declined");
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use essential cookies for cart and login.
          {hasPixels
            ? " Analytics (Google Analytics and marketing pixels) load only if you accept."
            : " Analytics tags stay off until measurement IDs are configured."}{" "}
          See our{" "}
          <Link href="/policies/privacy" className="underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" className="h-10 px-5" onClick={decline}>
            Essential only
          </Button>
          <Button className="h-10 px-5" onClick={accept}>
            Accept analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
