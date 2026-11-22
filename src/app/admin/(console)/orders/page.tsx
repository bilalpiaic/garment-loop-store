import Link from "next/link";
import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { listOrders } from "@/lib/platform";
import { formatDateTime } from "@/lib/admin-nav";
import { OrderBulkTable } from "@/components/admin/admin-crud";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const access = await loadAdminPage("orders.view");
  if (access.forbidden) return <Forbidden />;
  const { status } = await searchParams;
  const orders = (await listOrders())
    .filter((order) => (status ? order.status === status : true))
    .map((order) => ({
      orderNumber: order.orderNumber,
      createdAt: formatDateTime(order.createdAt),
      customerName: order.customer.fullName,
      city: order.customer.city,
      totalPkr: order.totalPkr,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
    }));
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sales</p>
        <h1 className="mt-1 font-serif text-3xl">Orders</h1>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {["", "pending", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled", "returned"].map(
          (value) => (
            <Link
              key={value || "all"}
              href={value ? `/admin/orders?status=${value}` : "/admin/orders"}
              className="rounded-full border px-3 py-1 capitalize"
            >
              {value || "All"}
            </Link>
          ),
        )}
      </div>
      <OrderBulkTable orders={orders} />
    </div>
  );
}
