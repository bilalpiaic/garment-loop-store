"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TakeBackCondition, TakeBackRequest } from "@/lib/commerce-types";

const CONDITIONS: { value: TakeBackCondition; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "worn", label: "Worn" },
  { value: "damaged", label: "Damaged" },
];

type Props = {
  defaultName?: string;
  defaultEmail?: string;
};

export function TakeBackForm({ defaultName = "", defaultEmail = "" }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState<TakeBackRequest | null>(null);
  const [condition, setCondition] = useState<TakeBackCondition>("good");

  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const response = await fetch("/api/circular/take-backs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: String(formData.get("customerName") ?? ""),
          customerEmail: String(formData.get("customerEmail") ?? ""),
          phone: String(formData.get("phone") ?? "") || undefined,
          preferredPickupDate: String(formData.get("preferredPickupDate") ?? "") || undefined,
          address: String(formData.get("address") ?? "") || undefined,
          city: String(formData.get("city") ?? "") || undefined,
          notes: String(formData.get("notes") ?? "") || undefined,
          items: [
            {
              description: String(formData.get("description") ?? ""),
              condition,
              quantity: Number(formData.get("quantity") ?? 1),
            },
          ],
        }),
      });
      const data = (await response.json()) as { error?: string; takeBack?: TakeBackRequest };
      if (!response.ok || !data.takeBack) {
        toast.error(data.error ?? "Could not submit take-back.");
        return;
      }
      toast.success("Take-back request submitted");
      setSubmitted(data.takeBack);
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
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Request received</p>
        <h2 className="font-serif text-2xl">{submitted.id}</h2>
        <p className="text-sm text-muted-foreground">
          Status: <span className="capitalize text-foreground">{submitted.status}</span>. Save this ID
          and your email to track pickup and credit.
        </p>
        <Button
          variant="outline"
          render={<a href={`/circular/take-back?track=${submitted.id}&email=${encodeURIComponent(submitted.customerEmail)}`} />}
        >
          Track this request
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
          <Input id="phone" name="phone" className="h-10" placeholder="+92…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferredPickupDate">Preferred pickup date</Label>
          <Input id="preferredPickupDate" name="preferredPickupDate" type="date" className="h-10" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Garment</Label>
        <Input
          id="description"
          name="description"
          required
          className="h-10"
          placeholder="e.g. Merino crew, charcoal, size M"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="condition">Condition</Label>
          <select
            id="condition"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={condition}
            onChange={(event) => setCondition(event.target.value as TakeBackCondition)}
          >
            {CONDITIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" name="quantity" type="number" min={1} max={20} defaultValue={1} className="h-10" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" className="h-10" placeholder="Lahore" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Pickup address</Label>
          <Input id="address" name="address" className="h-10" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Access notes, preferred window…" />
      </div>
      <Button type="submit" className="h-11 px-6" disabled={pending}>
        {pending ? "Submitting…" : "Request take-back"}
      </Button>
    </form>
  );
}
