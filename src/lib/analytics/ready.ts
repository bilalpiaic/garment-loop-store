"use client";

import { hasAnalyticsConsent } from "@/lib/analytics/consent";
import { gaMeasurementId, metaPixelId } from "@/lib/analytics/config";

function gaRuntimeReady() {
  return Boolean(gaMeasurementId()) && typeof window.gtag === "function";
}

function metaRuntimeReady() {
  return Boolean(metaPixelId()) && typeof window.fbq === "function";
}

/** True when consent is granted and at least one configured pixel runtime exists. */
export function isAnyPixelReady() {
  if (typeof window === "undefined") return false;
  if (!hasAnalyticsConsent()) return false;
  const ga = gaMeasurementId();
  const meta = metaPixelId();
  if (!ga && !meta) return true;
  return gaRuntimeReady() || metaRuntimeReady();
}

/** True when every configured pixel runtime is available (or none are configured). */
export function isAllPixelsReady() {
  if (typeof window === "undefined") return false;
  if (!hasAnalyticsConsent()) return false;
  const ga = gaMeasurementId();
  const meta = metaPixelId();
  if (!ga && !meta) return true;
  if (ga && typeof window.gtag !== "function") return false;
  if (meta && typeof window.fbq !== "function") return false;
  return true;
}

/** Prefer all pixels; callers may fall back to any after a wait cap. */
export function isTrackingReady() {
  return isAllPixelsReady();
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
