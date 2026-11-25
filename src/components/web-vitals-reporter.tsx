"use client";

import { useEffect } from "react";

type MetricName = "LCP" | "CLS" | "INP";

function ratingFor(name: MetricName, value: number): "good" | "needs-improvement" | "poor" {
  if (name === "LCP") {
    if (value <= 2500) return "good";
    if (value <= 4000) return "needs-improvement";
    return "poor";
  }
  if (name === "CLS") {
    if (value <= 0.1) return "good";
    if (value <= 0.25) return "needs-improvement";
    return "poor";
  }
  // INP
  if (value <= 200) return "good";
  if (value <= 500) return "needs-improvement";
  return "poor";
}

function postMetric(name: MetricName, value: number) {
  const payload = {
    name,
    value,
    rating: ratingFor(name, value),
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
  };
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/rum", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/rum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // RUM is best-effort.
  }
}

/**
 * Lightweight Core Web Vitals reporter (no npm dep).
 * Observes LCP / CLS / INP via PerformanceObserver and POSTs to /api/rum.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return;

    const cleanups: Array<() => void> = [];

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & { startTime?: number };
        if (last?.startTime != null) postMetric("LCP", last.startTime);
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      cleanups.push(() => lcpObserver.disconnect());
    } catch {
      // Unsupported
    }

    try {
      let cls = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
          if (!entry.hadRecentInput && typeof entry.value === "number") {
            cls += entry.value;
          }
        }
        postMetric("CLS", cls);
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
      cleanups.push(() => clsObserver.disconnect());
    } catch {
      // Unsupported
    }

    try {
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { duration?: number; interactionId?: number }>) {
          if (entry.interactionId && typeof entry.duration === "number") {
            postMetric("INP", entry.duration);
          }
        }
      });
      inpObserver.observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
      cleanups.push(() => inpObserver.disconnect());
    } catch {
      // Unsupported
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  return null;
}
