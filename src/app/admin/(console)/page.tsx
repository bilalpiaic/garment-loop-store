import Link from "next/link";
import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getDashboardMetrics } from "@/lib/platform";
import { formatDateTime, formatPkr } from "@/lib/admin-nav";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const access = await loadAdminPage("dashboard.view");
  if (access.forbidden) return <Forbidden />;
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
        <h1 className="mt-1 font-serif text-3xl">Today at the house</h1>
      </div>
      {metrics.lowStockCount > 0 ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">
            Low-stock alert · {metrics.lowStockCount} SKU{metrics.lowStockCount === 1 ? "" : "s"} at or
            below threshold
          </p>
          <p className="mt-1 text-muted-foreground">
            Review inventory before the next drop.{" "}
            <Link href="/admin/inventory" className="underline underline-offset-4">
              Open inventory
            </Link>
          </p>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Orders today" value={String(metrics.ordersToday)} />
        <Metric label="Revenue today" value={formatPkr(metrics.revenueToday)} />
        <Metric label="Open orders" value={String(metrics.pendingOrders)} />
        <Metric label="Low stock" value={String(metrics.lowStockCount)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm underline underline-offset-4">
              View all
            </Link>
          </div>
          {metrics.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet. Guest COD checkout is live on the storefront.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {metrics.recentOrders.map((order) => (
                <li key={order.orderNumber} className="flex items-center justify-between gap-3">
                  <div>
                    <Link href={`/admin/orders/${order.orderNumber}`} className="font-medium">
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {order.customer.fullName} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>{formatPkr(order.totalPkr)}</p>
                    <Badge variant="secondary" className="capitalize">
                      {order.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-serif text-2xl">Low stock</h2>
          {metrics.lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">All published variants are above the alert threshold.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {metrics.lowStock.slice(0, 8).map((item) => (
                <li key={item.variantId} className="flex justify-between">
                  <span>
                    {item.productTitle}
                    <span className="block text-xs text-muted-foreground">
                      {item.color} · {item.size}
                    </span>
                  </span>
                  <span>{item.stock} left</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            <Link href="/admin/products/new" className="underline underline-offset-4">
              New product
            </Link>
            <Link href="/admin/inventory" className="underline underline-offset-4">
              Inventory
            </Link>
            <Link href="/admin/discounts" className="underline underline-offset-4">
              New discount
            </Link>
          </div>
        </section>
      </div>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-serif text-2xl">Best sellers</h2>
        {metrics.topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sales will rank here after the first confirmed orders.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2">Product</th>
                <th>Units</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topProducts.map((item) => (
                <tr key={item.title} className="border-t">
                  <td className="py-2">{item.title}</td>
                  <td>{item.quantity}</td>
                  <td>{formatPkr(item.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
    </div>
  );
}
