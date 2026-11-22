"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RepairRequest } from "@/lib/commerce-types";

type Props = {
  defaultName?: string;
  defaultEmail?: string;
};

export function RepairForm({ defaultName = "", defaultEmail = "" }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState<RepairRequest | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const response = await fetch("/api/circular/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: String(formData.get("customerName") ?? ""),
          customerEmail: String(formData.get("customerEmail") ?? ""),
          phone: String(formData.get("phone") ?? "") || undefined,
          garmentDescription: String(formData.get("garmentDescription") ?? ""),
          issue: String(formData.get("issue") ?? ""),
          preferredDate: String(formData.get("preferredDate") ?? "") || undefined,
        }),
      });
      const data = (await response.json()) as { error?: string; repair?: RepairRequest };
      if (!response.ok || !data.repair) {
        toast.error(data.error ?? "Could not submit repair request.");
        return;
      }
      toast.success("Repair request submitted");
      setSubmitted(data.repair);
      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-3 rounded-xl border border-border/80 bg-card/40 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Booking received</p>
        <h2 className="font-serif text-2xl">{submitted.id}</h2>
        <p className="text-sm text-muted-foreground">
          Status: <span className="capitalize text-foreground">{submitted.status.replaceAll("_", " ")}</span>.
          We will quote and propose an atelier slot.
        </p>
        <Button
          variant="outline"
          render={
            <a
              href={`/circular/repair?track=${submitted.id}&email=${encodeURIComponent(submitted.customerEmail)}`}
            />
          }
        >
          Track this repair
        </Button>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerName">Name</Label>
          <Input id="customerName" name="customerName" defaultValue={defaultName} required className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerEmail">Email</Label>
          <Input
            id="customerEmail"
            name="customerEmail"
            type="email"
            defaultValue={defaultEmail}
            required
            className="h-10"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferredDate">Preferred date</Label>
          <Input id="preferredDate" name="preferredDate" type="date" className="h-10" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="garmentDescription">Garment</Label>
        <Input
          id="garmentDescription"
          name="garmentDescription"
          required
          className="h-10"
          placeholder="e.g. Alpine shell, olive, size L"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="issue">What needs repair?</Label>
        <Textarea
          id="issue"
          name="issue"
          rows={4}
          required
          placeholder="Zipper stuck, seam split, button missing…"
        />
      </div>
      <Button type="submit" className="h-11 px-6" disabled={pending}>
        {pending ? "Submitting…" : "Request repair booking"}
      </Button>
    </form>
  );
}
