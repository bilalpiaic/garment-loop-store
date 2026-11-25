"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AnalyticsExportButton() {
  const [pending, setPending] = useState(false);

  async function onDownload() {
    setPending(true);
    try {
      const response = await fetch("/api/admin/analytics/export");
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Could not export analytics CSV.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "garmentloop-orders-analytics.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Orders analytics CSV downloaded.");
    } catch {
      toast.error("Could not export analytics CSV.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" disabled={pending} onClick={onDownload}>
      {pending ? "Preparing…" : "Download orders CSV"}
    </Button>
  );
}
