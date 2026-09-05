"use client";

import { ThemeProvider } from "next-themes";
import { useHydrated } from "@/hooks/use-hydrated";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  useHydrated();
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      {children}
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}
