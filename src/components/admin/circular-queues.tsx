"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime, formatPkr } from "@/lib/admin-nav";
import type {
  CircularSubscription,
  RepairRequest,
  TakeBackRequest,
} from "@/lib/commerce-types";

const TAKE_BACK_STATUSES = [
  "requested",
  "scheduled",
  "received",
  "credited",
  "rejected",
  "completed",
] as const;

const REPAIR_STATUSES = [
  "requested",
  "quoted",
  "scheduled",
  "in_progress",
  "ready",
  "completed",
  "cancelled",
] as const;

const SUB_STATUSES = ["pending", "active", "paused", "cancelled", "past_due"] as const;

export function CircularQueues({
  takeBacks,
  repairs,
  subscriptions,
}: {
  takeBacks: TakeBackRequest[];
  repairs: RepairRequest[];
  subscriptions: CircularSubscription[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function patch(path: string, body: Record<string, unknown>, key: string) {
    setPending(key);
    try {
      const response = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Update failed.");
        return;
      }
      toast.success("Updated");
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl">Take-backs</h2>
          <p className="text-sm text-muted-foreground">
            Schedule pickup, set credit estimates, and close the loop.
          </p>
        </div>
        {takeBacks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No take-back requests yet.</p>
        ) : (
          <ul className="space-y-4">
            {takeBacks.map((item) => (
              <li key={item.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.customerName} · {item.customerEmail} · {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {item.status}
                  </Badge>
                </div>
                <ul className="mt-3 text-sm text-muted-foreground">
                  {item.items.map((line, index) => (
                    <li key={`${line.description}-${index}`}>
                      {line.description} · {line.condition} · ×{line.quantity}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <select
                      className="flex h-9 rounded-lg border border-input bg-background px-2 text-sm"
                      defaultValue={item.status}
                      onChange={(event) =>
                        void patch(
                          "/api/circular/take-backs",
                          { id: item.id, status: event.target.value },
                          `tb-status-${item.id}`,
                        )
                      }
                      disabled={pending === `tb-status-${item.id}`}
                    >
                      {TAKE_BACK_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      const credit = Number(form.get("credit") ?? 0);
                      void patch(
                        "/api/circular/take-backs",
                        { id: item.id, creditEstimatePkr: credit, status: "credited" },
                        `tb-credit-${item.id}`,
                      );
                    }}
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">Credit PKR</Label>
                      <Input
                        name="credit"
                        type="number"
                        min={0}
                        defaultValue={item.creditEstimatePkr ?? 0}
                        className="h-9 w-28"
                      />
                    </div>
                    <Button type="submit" size="sm" disabled={pending === `tb-credit-${item.id}`}>
                      Set credit
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl">Repairs</h2>
          <p className="text-sm text-muted-foreground">Quote, schedule, and mark atelier progress.</p>
        </div>
        {repairs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No repair requests yet.</p>
        ) : (
          <ul className="space-y-4">
            {repairs.map((item) => (
              <li key={item.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.customerName} · {item.customerEmail} · {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {item.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <p className="mt-3 text-sm">{item.garmentDescription}</p>
                <p className="text-sm text-muted-foreground">{item.issue}</p>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <select
                      className="flex h-9 rounded-lg border border-input bg-background px-2 text-sm"
                      defaultValue={item.status}
                      onChange={(event) =>
                        void patch(
                          "/api/circular/repairs",
                          { id: item.id, status: event.target.value },
                          `rp-status-${item.id}`,
                        )
                      }
                      disabled={pending === `rp-status-${item.id}`}
                    >
                      {REPAIR_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      void patch(
                        "/api/circular/repairs",
                        {
                          id: item.id,
                          quotePkr: Number(form.get("quote") ?? 0),
                          appointmentAt: String(form.get("appointment") ?? "") || undefined,
                          status: "quoted",
                        },
                        `rp-quote-${item.id}`,
                      );
                    }}
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">Quote PKR</Label>
                      <Input
                        name="quote"
                        type="number"
                        min={0}
                        defaultValue={item.quotePkr ?? 0}
                        className="h-9 w-28"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Appointment</Label>
                      <Input
                        name="appointment"
                        type="datetime-local"
                        defaultValue={item.appointmentAt?.slice(0, 16) ?? ""}
                        className="h-9"
                      />
                    </div>
                    <Button type="submit" size="sm" disabled={pending === `rp-quote-${item.id}`}>
                      Save quote
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl">Subscriptions</h2>
          <p className="text-sm text-muted-foreground">
            Care / Repair+ / Recycle Loop memberships (Stripe or mock).
          </p>
        </div>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No circular subscriptions yet.</p>
        ) : (
          <ul className="space-y-4">
            {subscriptions.map((item) => (
              <li key={item.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {item.planName} · {item.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.customerName} · {item.customerEmail} · {formatDateTime(item.createdAt)} ·{" "}
                      {formatPkr(item.pricePkr)}/{item.billingInterval}
                      {item.mock ? " · mock" : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {item.status}
                  </Badge>
                </div>
                <div className="mt-4 space-y-1">
                  <Label className="text-xs">Status</Label>
                  <select
                    className="flex h-9 rounded-lg border border-input bg-background px-2 text-sm"
                    defaultValue={item.status}
                    onChange={(event) =>
                      void patch(
                        "/api/circular/subscriptions",
                        { id: item.id, status: event.target.value },
                        `sub-${item.id}`,
                      )
                    }
                    disabled={pending === `sub-${item.id}`}
                  >
                    {SUB_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
