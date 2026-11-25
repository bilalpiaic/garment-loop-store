"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category, Collection } from "@/lib/catalog";
import { slugify } from "@/lib/slug";
import type { Discount } from "@/lib/identity";
import type { Role } from "@/lib/roles";
import { ORDER_STATUSES, type Order, type PaymentStatus } from "@/lib/order-model";
import { formatPkr } from "@/lib/admin-nav";

export function TaxonomyForm({
  kind,
  item,
}: {
  kind: "categories" | "collections";
  item?: Category | Collection;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function onSubmit(formData: FormData) {
    setPending(true);
    const name = String(formData.get("name") ?? "");
    const payload = {
      name,
      slug: String(formData.get("slug") ?? "") || slugify(name),
      description: String(formData.get("description") ?? ""),
      image: String(formData.get("image") ?? ""),
    };
    try {
      const response = await fetch(`/api/admin/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not save.");
        return;
      }
      toast.success("Saved.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={onSubmit} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
      <Field label="Name">
        <Input name="name" defaultValue={item?.name} className="h-10" required />
      </Field>
      <Field label="Slug">
        <Input name="slug" defaultValue={item?.slug} className="h-10" />
      </Field>
      <Field label="Image URL">
        <Input name="image" defaultValue={item?.image} className="h-10" required />
      </Field>
      <Field label="Description">
        <Input name="description" defaultValue={item?.description} className="h-10" required />
      </Field>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : item ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteTaxonomyButton({ kind, slug }: { kind: "categories" | "collections"; slug: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-xs text-destructive"
      onClick={async () => {
        const response = await fetch(`/api/admin/${kind}?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) toast.error(data.error ?? "Could not delete.");
        else {
          toast.success("Removed.");
          router.refresh();
        }
      }}
    >
      Delete
    </button>
  );
}

export function InventoryAdjust({ variantId }: { variantId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("Manual adjustment");
  async function apply(sign: 1 | -1) {
    const change = Math.abs(qty || 1) * sign;
    setPending(true);
    try {
      const response = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, change, reason: reason.trim() || "Manual adjustment" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) toast.error(data.error ?? "Could not adjust stock.");
      else {
        toast.success(`Stock ${change > 0 ? "increased" : "decreased"} by ${Math.abs(change)}.`);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Input
        type="number"
        min={1}
        value={qty}
        onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))}
        className="h-8 w-16"
      />
      <Input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="h-8 w-36"
        placeholder="Reason"
      />
      <Button size="xs" variant="outline" disabled={pending} onClick={() => apply(-1)}>
        −
      </Button>
      <Button size="xs" variant="outline" disabled={pending} onClick={() => apply(1)}>
        +
      </Button>
    </div>
  );
}

export function OrderStatusForm({ order }: { order: Order }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.orderNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: String(formData.get("status")),
          paymentStatus: String(formData.get("paymentStatus")),
          trackingNumber: String(formData.get("trackingNumber") ?? ""),
          courier: String(formData.get("courier") ?? ""),
          notes: String(formData.get("notes") ?? ""),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) toast.error(data.error ?? "Could not update order.");
      else {
        toast.success("Order updated.");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={onSubmit} className="space-y-3 rounded-xl border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fulfillment">
          <select name="status" defaultValue={order.status} className="h-10 w-full rounded-lg border px-3 text-sm">
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Payment">
          <select
            name="paymentStatus"
            defaultValue={order.paymentStatus}
            className="h-10 w-full rounded-lg border px-3 text-sm"
          >
            {(["pending", "paid", "failed", "refunded"] as PaymentStatus[]).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Courier">
          <Input name="courier" defaultValue={order.courier} className="h-10" />
        </Field>
        <Field label="Tracking number">
          <Input name="trackingNumber" defaultValue={order.trackingNumber} className="h-10" />
        </Field>
      </div>
      <Field label="Internal notes">
        <Textarea name="notes" defaultValue={order.notes} rows={3} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Update order"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              const response = await fetch("/api/admin/shipping/label", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderNumber: order.orderNumber }),
              });
              const data = (await response.json()) as {
                ok?: boolean;
                message?: string;
                error?: string;
                labelUrl?: string;
                trackingNumber?: string;
              };
              if (!response.ok) {
                toast.error(data.error ?? data.message ?? "Could not buy label.");
                return;
              }
              toast.success(data.message ?? "Label purchased.", {
                description: data.trackingNumber
                  ? `Tracking ${data.trackingNumber}`
                  : data.labelUrl,
              });
              if (data.labelUrl) window.open(data.labelUrl, "_blank", "noopener,noreferrer");
              router.refresh();
            } finally {
              setPending(false);
            }
          }}
        >
          Create shipping label
        </Button>
      </div>
    </form>
  );
}

export function DiscountForm({ discount }: { discount?: Discount }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const response = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: discount?.id,
          code: String(formData.get("code") ?? ""),
          description: String(formData.get("description") ?? ""),
          type: String(formData.get("type")),
          value: Number(formData.get("value")),
          minOrderPkr: formData.get("minOrderPkr") ? Number(formData.get("minOrderPkr")) : undefined,
          usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : undefined,
          expiresAt: String(formData.get("expiresAt") ?? "") || undefined,
          active: formData.get("active") === "on",
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) toast.error(data.error ?? "Could not save discount.");
      else {
        toast.success("Discount saved.");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={onSubmit} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
      <Field label="Code">
        <Input name="code" defaultValue={discount?.code} className="h-10" required />
      </Field>
      <Field label="Description">
        <Input name="description" defaultValue={discount?.description} className="h-10" required />
      </Field>
      <Field label="Type">
        <select name="type" defaultValue={discount?.type ?? "percentage"} className="h-10 w-full rounded-lg border px-3 text-sm">
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed PKR</option>
        </select>
      </Field>
      <Field label="Value">
        <Input name="value" type="number" defaultValue={discount?.value ?? 10} className="h-10" required />
      </Field>
      <Field label="Min order (PKR)">
        <Input name="minOrderPkr" type="number" defaultValue={discount?.minOrderPkr} className="h-10" />
      </Field>
      <Field label="Usage limit">
        <Input name="usageLimit" type="number" defaultValue={discount?.usageLimit} className="h-10" />
      </Field>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="active" defaultChecked={discount?.active ?? true} />
        Active
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : discount ? "Update" : "Create coupon"}
        </Button>
      </div>
    </form>
  );
}

export function AdminUserForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          role: String(formData.get("role")) as Role,
          password: String(formData.get("password") ?? ""),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) toast.error(data.error ?? "Could not create user.");
      else {
        toast.success("User created.");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={onSubmit} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
      <Field label="Name">
        <Input name="name" className="h-10" required />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" className="h-10" required />
      </Field>
      <Field label="Role">
        <select name="role" defaultValue="staff" className="h-10 w-full rounded-lg border px-3 text-sm">
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
      </Field>
      <Field label="Password">
        <Input name="password" type="password" className="h-10" required minLength={8} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add user"}
        </Button>
      </div>
    </form>
  );
}

export function SettingsForm({
  settings,
}: {
  settings: {
    storeName: string;
    supportEmail: string;
    supportPhone: string;
    whatsapp: string;
    freeShippingThresholdPkr: number;
    domesticShippingPkr: number;
    internationalShippingPkr: number;
    usdRate: number;
    lowStockThreshold: number;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: String(formData.get("storeName")),
          supportEmail: String(formData.get("supportEmail")),
          supportPhone: String(formData.get("supportPhone")),
          whatsapp: String(formData.get("whatsapp")),
          freeShippingThresholdPkr: Number(formData.get("freeShippingThresholdPkr")),
          domesticShippingPkr: Number(formData.get("domesticShippingPkr")),
          internationalShippingPkr: Number(formData.get("internationalShippingPkr")),
          usdRate: Number(formData.get("usdRate")),
          lowStockThreshold: Number(formData.get("lowStockThreshold")),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) toast.error(data.error ?? "Could not save settings.");
      else {
        toast.success("Settings saved.");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={onSubmit} className="grid gap-3 md:grid-cols-2">
      <Field label="Store name">
        <Input name="storeName" defaultValue={settings.storeName} className="h-10" />
      </Field>
      <Field label="Support email">
        <Input name="supportEmail" defaultValue={settings.supportEmail} className="h-10" />
      </Field>
      <Field label="Phone">
        <Input name="supportPhone" defaultValue={settings.supportPhone} className="h-10" />
      </Field>
      <Field label="WhatsApp (digits)">
        <Input name="whatsapp" defaultValue={settings.whatsapp} className="h-10" />
      </Field>
      <Field label="Free shipping threshold (PKR)">
        <Input name="freeShippingThresholdPkr" type="number" defaultValue={settings.freeShippingThresholdPkr} className="h-10" />
      </Field>
      <Field label="Domestic shipping (PKR)">
        <Input name="domesticShippingPkr" type="number" defaultValue={settings.domesticShippingPkr} className="h-10" />
      </Field>
      <Field label="International shipping (PKR)">
        <Input name="internationalShippingPkr" type="number" defaultValue={settings.internationalShippingPkr} className="h-10" />
      </Field>
      <Field label="USD rate">
        <Input name="usdRate" type="number" defaultValue={settings.usdRate} className="h-10" />
      </Field>
      <Field label="Low-stock threshold">
        <Input name="lowStockThreshold" type="number" defaultValue={settings.lowStockThreshold} className="h-10" />
      </Field>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">Current free-shipping example: {formatPkr(settings.freeShippingThresholdPkr)}.</p>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
