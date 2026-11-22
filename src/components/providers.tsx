"use client";

import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { useHydrated } from "@/hooks/use-hydrated";
import { Toaster } from "@/components/ui/sonner";
import { AnalyticsBootstrap } from "@/components/analytics/analytics-bootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  useHydrated();
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      {children}
      <Suspense fallback={null}>
        <AnalyticsBootstrap />
      </Suspense>
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}
