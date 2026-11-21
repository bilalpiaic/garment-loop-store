"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RETURN_REASON_CODES } from "@/lib/commerce-types";
import type { Order } from "@/lib/order-model";
import { cn } from "@/lib/utils";

export function ReturnRequestForm({ order }: { order: Order }) {
  const router = useRouter();
  const eligible = order.status === "delivered" || order.status === "shipped";
  const [pending, setPending] = useState(false);
  const [reasonCode, setReasonCode] = useState<(typeof RETURN_REASON_CODES)[number]["code"]>("size_fit");
  const [selected, setSelected] = useState<Record<string, number>>(() =>
    Object.fromEntries(order.items.map((item) => [item.variantId, item.quantity])),
  );

  const type = reasonCode === "exchange" ? "exchange" : "return";
  const items = useMemo(
    () =>
      order.items
        .filter((item) => (selected[item.variantId] ?? 0) > 0)
        .map((item) => ({
          variantId: item.variantId,
          quantity: Math.min(selected[item.variantId] ?? 0, item.quantity),
        })),
    [order.items, selected],
  );

  if (!eligible) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
        Returns open once your order is shipped or delivered. Current status:{" "}
        <span className="capitalize text-foreground">{order.status}</span>.
      </div>
    );
  }

  async function onSubmit(formData: FormData) {
    if (items.length === 0) {
      toast.error("Select at least one item.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/account/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          reasonCode,
          type,
          reason: String(formData.get("reason") ?? ""),
          items,
        }),
      });
      const data = (await response.json()) as { error?: string; return?: { id: string } };
      if (!response.ok) {
        toast.error(data.error ?? "Could not submit return.");
        return;
      }
      toast.success(`Return request ${data.return?.id ?? ""} submitted`);
      router.push("/account/returns");
      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-5 rounded-xl border bg-card/40 p-5">
      <div>
        <h2 className="font-serif text-2xl">Request a return or exchange</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose items and a reason. Our team reviews every request in the admin RMA queue.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Items</legend>
        <ul className="space-y-2">
          {order.items.map((item) => {
            const qty = selected[item.variantId] ?? 0;
            return (
              <li
                key={item.variantId}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm",
                  qty > 0 ? "border-primary/40" : "border-border opacity-70",
                )}
              >
                <div>
                  <p className="font-medium">{item.productTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.color} · {item.size} · ordered ×{item.quantity}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  Qty
                  <select
                    className="h-9 rounded-md border border-input bg-transparent px-2"
                    value={qty}
                    onChange={(event) =>
                      setSelected((prev) => ({
                        ...prev,
                        [item.variantId]: Number(event.target.value),
                      }))
                    }
                  >
                    {Array.from({ length: item.quantity + 1 }, (_, index) => (
                      <option key={index} value={index}>
                        {index}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="reasonCode">Reason</Label>
        <select
          id="reasonCode"
          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
          value={reasonCode}
          onChange={(event) =>
            setReasonCode(event.target.value as (typeof RETURN_REASON_CODES)[number]["code"])
          }
        >
          {RETURN_REASON_CODES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Details</Label>
        <Textarea
          id="reason"
          name="reason"
          rows={4}
          required
          minLength={3}
          placeholder="Tell us what happened so we can help quickly."
        />
      </div>

      <Button type="submit" className="h-11 px-6" disabled={pending}>
        {pending ? "Submitting…" : type === "exchange" ? "Request exchange" : "Request return"}
      </Button>
    </form>
  );
}
