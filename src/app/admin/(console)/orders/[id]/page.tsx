import { notFound } from "next/navigation";
import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getOrder } from "@/lib/platform";
import { formatDateTime, formatPkr } from "@/lib/admin-nav";
import { OrderStatusForm } from "@/components/admin/admin-forms";

export const metadata = { title: "Order" };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await loadAdminPage("orders.view");
  if (access.forbidden) return <Forbidden />;
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Order</p>
          <h1 className="mt-1 font-serif text-3xl">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
        </div>
        <section className="rounded-xl border bg-card p-5 text-sm">
          <h2 className="font-serif text-2xl">Customer</h2>
          <p className="mt-3 font-medium">{order.customer.fullName}</p>
          <p>{order.customer.email}</p>
          <p>{order.customer.phone}</p>
          <p className="mt-2">
            {order.customer.address}, {order.customer.area}, {order.customer.city}, {order.customer.country}
          </p>
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-2xl">Items</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {order.items.map((item) => (
              <li key={item.variantId} className="flex justify-between gap-3">
                <span>
                  {item.productTitle}
                  <span className="block text-xs text-muted-foreground">
                    {item.color} · {item.size} · ×{item.quantity}
                  </span>
                </span>
                <span>{formatPkr(item.totalPkr)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPkr(order.subtotalPkr)}</span>
            </div>
            {order.discountPkr ? (
              <div className="flex justify-between">
                <span>Discount {order.discountCode ? `(${order.discountCode})` : ""}</span>
                <span>−{formatPkr(order.discountPkr)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span>{order.shippingLabel ?? "Shipping"}</span>
              <span>{formatPkr(order.shippingPkr)}</span>
            </div>
            {order.taxPkr ? (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatPkr(order.taxPkr)}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{formatPkr(order.totalPkr)}</span>
            </div>
          </div>
        </section>
      </div>
      <OrderStatusForm order={order} />
    </div>
  );
}
