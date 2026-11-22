"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/admin-nav";
import type { RepairRequest, TakeBackRequest } from "@/lib/commerce-types";

type Kind = "take-back" | "repair";

export function CircularStatusLookup({
  kind,
  initialId = "",
  initialEmail = "",
}: {
  kind: Kind;
  initialId?: string;
  initialEmail?: string;
}) {
  const [pending, setPending] = useState(false);
  const [takeBack, setTakeBack] = useState<TakeBackRequest | null>(null);
  const [repair, setRepair] = useState<RepairRequest | null>(null);

  async function lookup(id: string, email: string) {
    if (!id.trim() || !email.trim()) return;
    setPending(true);
    setTakeBack(null);
    setRepair(null);
    try {
      const path =
        kind === "take-back"
          ? `/api/circular/take-backs?id=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`
          : `/api/circular/repairs?id=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`;
      const response = await fetch(path);
      const data = (await response.json()) as {
        error?: string;
        takeBack?: TakeBackRequest;
        repair?: RepairRequest;
      };
      if (!response.ok) {
        toast.error(data.error ?? "Not found.");
        return;
      }
      if (data.takeBack) setTakeBack(data.takeBack);
      if (data.repair) setRepair(data.repair);
    } catch {
      toast.error("Network error.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (initialId && initialEmail) {
      void lookup(initialId, initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot from URL
  }, []);

  async function onSubmit(formData: FormData) {
    await lookup(String(formData.get("id") ?? ""), String(formData.get("email") ?? ""));
  }

  const result = takeBack ?? repair;

  return (
    <div className="space-y-4">
      <form action={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="track-id">Request ID</Label>
          <Input id="track-id" name="id" defaultValue={initialId} required className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="track-email">Email</Label>
          <Input
            id="track-email"
            name="email"
            type="email"
            defaultValue={initialEmail}
            required
            className="h-10"
          />
        </div>
        <Button type="submit" className="h-10" disabled={pending}>
          {pending ? "Looking up…" : "Track"}
        </Button>
      </form>

      {result ? (
        <div className="rounded-xl border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{result.id}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(result.createdAt)}</p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {result.status.replaceAll("_", " ")}
            </Badge>
          </div>
          {takeBack ? (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {takeBack.items.map((item, index) => (
                <li key={`${item.description}-${index}`}>
                  {item.description} · {item.condition} · ×{item.quantity}
                </li>
              ))}
              {typeof takeBack.creditEstimatePkr === "number" ? (
                <li>Credit estimate: PKR {takeBack.creditEstimatePkr.toLocaleString("en-PK")}</li>
              ) : null}
            </ul>
          ) : null}
          {repair ? (
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>{repair.garmentDescription}</p>
              <p>{repair.issue}</p>
              {typeof repair.quotePkr === "number" ? (
                <p>Quote: PKR {repair.quotePkr.toLocaleString("en-PK")}</p>
              ) : null}
              {repair.appointmentAt ? <p>Appointment: {repair.appointmentAt}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
