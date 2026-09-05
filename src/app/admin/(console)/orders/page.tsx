import Link from "next/link";
import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { listOrders } from "@/lib/platform";
import { formatDateTime, formatPkr } from "@/lib/admin-nav";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const access = await loadAdminPage("orders.view");
  if (access.forbidden) return <Forbidden />;
  const { status } = await searchParams;
  const orders = (await listOrders()).filter((order) => (status ? order.status === status : true));
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sales</p>
        <h1 className="mt-1 font-serif text-3xl">Orders</h1>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {["", "pending", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled"].map((value) => (
          <Link
            key={value || "all"}
            href={value ? `/admin/orders?status=${value}` : "/admin/orders"}
            className="rounded-full border px-3 py-1 capitalize"
          >
            {value || "All"}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Order</th>
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
                  <Link href={`/admin/orders/${order.orderNumber}`} className="font-medium underline-offset-4 hover:underline">
                    {order.orderNumber}
                  </Link>
                </td>
                <td>{formatDateTime(order.createdAt)}</td>
                <td>
                  {order.customer.fullName}
                  <span className="block text-xs text-muted-foreground">{order.customer.city}</span>
                </td>
                <td>{formatPkr(order.totalPkr)}</td>
                <td className="capitalize">
                  {order.paymentMethod.replace("_", " ")} · {order.paymentStatus}
                </td>
                <td>
                  <Badge variant="secondary" className="capitalize">
                    {order.status}
                  </Badge>
                </td>
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
