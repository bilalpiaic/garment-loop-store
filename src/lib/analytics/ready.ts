"use client";

import { hasAnalyticsConsent } from "@/lib/analytics/consent";
import { gaMeasurementId, metaPixelId } from "@/lib/analytics/config";

/** True when consent is granted and any configured pixel runtime is available. */
export function isTrackingReady() {
  if (typeof window === "undefined") return false;
  if (!hasAnalyticsConsent()) return false;
  const ga = gaMeasurementId();
  const meta = metaPixelId();
  if (!ga && !meta) return true;
  if (ga && typeof window.gtag !== "function") return false;
  if (meta && typeof window.fbq !== "function") return false;
  return true;
}

export function subscribeConsent(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener("garmentloop:consent", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("garmentloop:consent", handler);
    window.removeEventListener("storage", handler);
  };
}
