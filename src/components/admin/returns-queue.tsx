"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ReturnRequest } from "@/lib/commerce-types";
import { formatDateTime } from "@/lib/admin-nav";

export function ReturnsQueue({ returns }: { returns: ReturnRequest[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function createReturn(formData: FormData) {
    setPending(true);
    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: String(formData.get("orderNumber") ?? "").trim(),
          reason: String(formData.get("reason") ?? "").trim(),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not create RMA.");
        return;
      }
      toast.success("Return request created");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function act(id: string, action: "approve" | "reject" | "restock" | "refund") {
    const target = returns.find((item) => item.id === id);
    const response = await fetch("/api/returns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(data.error ?? "Could not update return.");
      return;
    }
    if (action === "refund" && target) {
      // Full-transaction refund (no items array) so GA4 matches purchase item_ids.
      const { trackRefund } = await import("@/lib/analytics");
      void trackRefund(target.orderNumber);
    }
    toast.success(`Return ${action}d`);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form action={createReturn} className="max-w-xl space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-serif text-2xl">Open RMA</h2>
        <div className="space-y-2">
          <Label htmlFor="orderNumber">Order number</Label>
          <Input id="orderNumber" name="orderNumber" className="h-10" placeholder="GL-0001" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason</Label>
          <Textarea id="reason" name="reason" rows={3} required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create return request"}
        </Button>
      </form>

      {returns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No return requests yet.</p>
      ) : (
        <ul className="space-y-4">
          {returns.map((item) => (
            <li key={item.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {item.id} · {item.orderNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.customerName} · {item.customerEmail} · {formatDateTime(item.createdAt)}
                    {item.source ? ` · via ${item.source}` : ""}
                    {item.reasonCode ? ` · ${item.reasonCode}` : ""}
                    {item.type ? ` · ${item.type}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {item.status}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{item.reason}</p>
              <ul className="mt-2 text-sm">
                {item.items.map((line) => (
                  <li key={line.variantId}>
                    {line.productTitle} ×{line.quantity}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.status === "requested" ? (
                  <>
                    <Button size="sm" onClick={() => act(item.id, "approve")}>
                      Approve + restock
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => act(item.id, "reject")}>
                      Reject
                    </Button>
                  </>
                ) : null}
                {item.status === "approved" || item.status === "received" ? (
                  <Button size="sm" onClick={() => act(item.id, "restock")}>
                    Restock inventory
                  </Button>
                ) : null}
                {item.status === "restocked" || item.status === "approved" ? (
                  <Button size="sm" variant="outline" onClick={() => act(item.id, "refund")}>
                    Mark refunded
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
