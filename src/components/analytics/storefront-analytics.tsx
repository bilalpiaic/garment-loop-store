"use client";

import { Suspense } from "react";
import { AnalyticsBootstrap } from "@/components/analytics/analytics-bootstrap";

/** Storefront-only — keeps GA4/Meta off `/admin/*`. */
export function StorefrontAnalytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsBootstrap />
    </Suspense>
  );
}
