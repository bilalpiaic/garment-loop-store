"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PrivacyControls() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        toast.error(data.error ?? "Could not export data.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `garmentloop-export-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    } catch {
      toast.error("Network error.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "Delete your account? We anonymize your profile and invalidate sessions. Order totals are kept for records.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not delete account.");
        return;
      }
      toast.success(data.message ?? "Account deleted.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl">Privacy</h2>
      <p className="text-sm text-muted-foreground">
        Download a JSON copy of your account data, or anonymize your profile (GDPR-style export /
        delete). Gift codes like <code className="text-xs">GL-GIFT-1000</code> can be entered at
        checkout.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={exportData} disabled={exporting || deleting}>
          {exporting ? "Exporting…" : "Export data"}
        </Button>
        <Button type="button" variant="destructive" onClick={deleteAccount} disabled={exporting || deleting}>
          {deleting ? "Deleting…" : "Delete account"}
        </Button>
      </div>
    </section>
  );
}
