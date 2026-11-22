"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/lib/catalog";
import type { Role } from "@/lib/roles";
import { roleLabel } from "@/lib/roles";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-model";
import type { Discount } from "@/lib/identity";

export function ProductBulkTable({
  products,
}: {
  products: {
    id: string;
    title: string;
    slug: string;
    category: string;
    status?: string;
    price: number;
    stock: number;
  }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const allIds = products.map((product) => product.id);

  async function apply(status: "published" | "draft" | "archived") {
    if (selected.length === 0) {
      toast.error("Select at least one product.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, status }),
      });
      const data = (await response.json()) as { error?: string; updated?: number };
      if (!response.ok) {
        toast.error(data.error ?? "Bulk update failed.");
        return;
      }
      toast.success(`Updated ${data.updated ?? selected.length} products.`);
      setSelected([]);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function archiveOne(id: string) {
    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) toast.error(data.error ?? "Could not archive.");
    else {
      toast.success("Archived.");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setSelected(selected.length === allIds.length ? [] : allIds)}
        >
          {selected.length === allIds.length ? "Clear selection" : "Select all"}
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={() => apply("published")}>
          Publish
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => apply("draft")}>
          Draft
        </Button>
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => apply("archived")}>
          Archive
        </Button>
        <span className="text-xs text-muted-foreground">{selected.length} selected</span>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 w-10" />
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(product.id)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, product.id]
                          : current.filter((id) => id !== product.id),
                      )
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{product.title}</p>
                  <p className="text-xs text-muted-foreground">{product.slug}</p>
                </td>
                <td className="capitalize">{product.category}</td>
                <td>PKR {product.price.toLocaleString("en-PK")}</td>
                <td>{product.stock}</td>
                <td className="capitalize">{product.status ?? "published"}</td>
                <td className="px-4 py-3 text-right space-x-3">
                  <a href={`/admin/products/${product.id}`} className="underline underline-offset-4">
                    Edit
                  </a>
                  <button type="button" className="text-xs text-destructive" onClick={() => archiveOne(product.id)}>
                    Archive
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OrderBulkTable({
  orders,
}: {
  orders: {
    orderNumber: string;
    createdAt: string;
    customerName: string;
    city: string;
    totalPkr: number;
    paymentMethod: string;
    paymentStatus: string;
    status: string;
  }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<OrderStatus>("processing");
  const [pending, setPending] = useState(false);

  async function apply() {
    if (selected.length === 0) {
      toast.error("Select at least one order.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/admin/orders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumbers: selected, status }),
      });
      const data = (await response.json()) as { error?: string; updated?: number };
      if (!response.ok) {
        toast.error(data.error ?? "Bulk update failed.");
        return;
      }
      toast.success(`Updated ${data.updated ?? selected.length} orders.`);
      setSelected([]);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-md border px-2 text-sm capitalize"
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus)}
        >
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" disabled={pending} onClick={apply}>
          Apply status to selected
        </Button>
        <span className="text-xs text-muted-foreground">{selected.length} selected</span>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 w-10" />
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.orderNumber} className="border-t">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(order.orderNumber)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, order.orderNumber]
                          : current.filter((value) => value !== order.orderNumber),
                      )
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/admin/orders/${order.orderNumber}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {order.orderNumber}
                  </a>
                </td>
                <td>{order.createdAt}</td>
                <td>
                  {order.customerName}
                  <span className="block text-xs text-muted-foreground">{order.city}</span>
                </td>
                <td>PKR {order.totalPkr.toLocaleString("en-PK")}</td>
                <td className="capitalize">
                  {order.paymentMethod.replace("_", " ")} · {order.paymentStatus}
                </td>
                <td className="capitalize">{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No orders match this filter.</p>
        ) : null}
      </div>
    </div>
  );
}

export function CollectionAssignForm({
  slug,
  products,
}: {
  slug: string;
  products: Product[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(() =>
    products.filter((product) => product.collections.includes(slug)).map((product) => product.id),
  );
  const [pending, setPending] = useState(false);
  const count = useMemo(() => selected.length, [selected]);

  async function save() {
    setPending(true);
    try {
      const response = await fetch("/api/admin/collections/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, productIds: selected }),
      });
      const data = (await response.json()) as { error?: string; count?: number };
      if (!response.ok) {
        toast.error(data.error ?? "Could not assign products.");
        return;
      }
      toast.success(`Collection now has ${data.count ?? count} products.`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <p className="text-sm font-medium">Assign products · {count} selected</p>
      <div className="max-h-56 space-y-2 overflow-y-auto text-sm">
        {products.map((product) => (
          <label key={product.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(product.id)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, product.id]
                    : current.filter((id) => id !== product.id),
                )
              }
            />
            <span>
              {product.title}
              <span className="ml-2 text-xs text-muted-foreground">{product.status ?? "published"}</span>
            </span>
          </label>
        ))}
      </div>
      <Button type="button" size="sm" disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save assignments"}
      </Button>
    </div>
  );
}

export function DiscountRowActions({ discount }: { discount: Discount }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  async function remove() {
    const response = await fetch(`/api/admin/discounts?id=${encodeURIComponent(discount.id)}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) toast.error(data.error ?? "Could not delete.");
    else {
      toast.success("Discount deleted.");
      router.refresh();
    }
  }

  return (
    <div className="space-y-2 text-right">
      <div className="flex justify-end gap-3">
        <button type="button" className="text-xs underline underline-offset-4" onClick={() => setEditing((v) => !v)}>
          {editing ? "Hide" : "Edit"}
        </button>
        <button type="button" className="text-xs text-destructive" onClick={remove}>
          Delete
        </button>
      </div>
      {editing ? (
        <div className="text-left">
          {/* Inline edit uses shared DiscountForm via page re-render pattern */}
          <DiscountInlineEdit discount={discount} onDone={() => setEditing(false)} />
        </div>
      ) : null}
    </div>
  );
}

function DiscountInlineEdit({ discount, onDone }: { discount: Discount; onDone: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const response = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: discount.id,
          code: String(formData.get("code") ?? ""),
          description: String(formData.get("description") ?? ""),
          type: String(formData.get("type")),
          value: Number(formData.get("value")),
          minOrderPkr: formData.get("minOrderPkr") ? Number(formData.get("minOrderPkr")) : undefined,
          usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : undefined,
          active: formData.get("active") === "on",
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) toast.error(data.error ?? "Could not save.");
      else {
        toast.success("Discount updated.");
        onDone();
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={onSubmit} className="mt-2 grid gap-2 rounded-lg border p-3 md:grid-cols-2">
      <Input name="code" defaultValue={discount.code} className="h-9" required />
      <Input name="description" defaultValue={discount.description} className="h-9" required />
      <select name="type" defaultValue={discount.type} className="h-9 rounded-md border px-2 text-sm">
        <option value="percentage">Percentage</option>
        <option value="fixed">Fixed PKR</option>
      </select>
      <Input name="value" type="number" defaultValue={discount.value} className="h-9" required />
      <Input name="minOrderPkr" type="number" defaultValue={discount.minOrderPkr} className="h-9" placeholder="Min order" />
      <Input name="usageLimit" type="number" defaultValue={discount.usageLimit} className="h-9" placeholder="Usage limit" />
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="active" defaultChecked={discount.active} />
        Active
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function AdminUserRow({
  user,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    active: boolean;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function patch(next: Partial<{ role: Role; active: boolean; password: string }>) {
    setPending(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          role: next.role ?? user.role,
          active: next.active ?? user.active,
          password: next.password,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) toast.error(data.error ?? "Could not update user.");
      else {
        toast.success("User updated.");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <tr className="border-t">
      <td className="px-4 py-3 font-medium">{user.name}</td>
      <td>{user.email}</td>
      <td>
        <select
          className="h-9 rounded-md border px-2 text-sm"
          disabled={pending || user.role === "owner"}
          value={user.role}
          onChange={(event) => patch({ role: event.target.value as Role })}
        >
          <option value="staff">{roleLabel("staff")}</option>
          <option value="admin">{roleLabel("admin")}</option>
          <option value="owner">{roleLabel("owner")}</option>
        </select>
      </td>
      <td>
        <BadgeLike active={user.active} />
      </td>
      <td className="px-4 py-3 text-right">
        {user.role === "owner" ? (
          <span className="text-xs text-muted-foreground">Protected</span>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => patch({ active: !user.active })}
          >
            {user.active ? "Deactivate" : "Activate"}
          </Button>
        )}
      </td>
    </tr>
  );
}

function BadgeLike({ active }: { active: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
      {active ? "Active" : "Disabled"}
    </span>
  );
}

export function CustomerProfileForm({
  customer,
  canEdit,
}: {
  customer: {
    id: string;
    fullName?: string;
    phone?: string;
    notes?: string;
    tags?: string[];
  };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  if (!canEdit) {
    return (
      <div className="rounded-xl border bg-card p-5 text-sm">
        <p>
          <span className="text-muted-foreground">Notes:</span> {customer.notes || "—"}
        </p>
        <p className="mt-2">
          <span className="text-muted-foreground">Tags:</span>{" "}
          {(customer.tags ?? []).join(", ") || "—"}
        </p>
      </div>
    );
  }
  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const tags = String(formData.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const response = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customer.id,
          fullName: String(formData.get("fullName") ?? ""),
          phone: String(formData.get("phone") ?? "") || undefined,
          notes: String(formData.get("notes") ?? ""),
          tags,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) toast.error(data.error ?? "Could not save customer.");
      else {
        toast.success("Customer updated.");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={onSubmit} className="space-y-3 rounded-xl border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Full name</Label>
          <Input name="fullName" defaultValue={customer.fullName} className="h-10" />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input name="phone" defaultValue={customer.phone} className="h-10" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Tags (comma separated)</Label>
        <Input name="tags" defaultValue={(customer.tags ?? []).join(", ")} className="h-10" placeholder="vip, wholesale" />
      </div>
      <div className="space-y-2">
        <Label>Internal notes</Label>
        <Textarea name="notes" rows={4} defaultValue={customer.notes} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save customer"}
      </Button>
    </form>
  );
}
