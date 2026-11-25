import Link from "next/link";
import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getDashboardMetrics } from "@/lib/platform";
import { formatPkr } from "@/lib/admin-nav";
import { AnalyticsExportButton } from "@/components/admin/analytics-export-button";

export const metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const access = await loadAdminPage("dashboard.view");
  if (access.forbidden) return <Forbidden />;
  const metrics = await getDashboardMetrics();
  const statuses = Object.entries(metrics.statusBreakdown ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reports</p>
          <h1 className="mt-1 font-serif text-3xl">Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Live totals from platform state — orders, customers, catalog, and ops queues. ERP sync is
            not connected; download CSV for a thin BI export.
          </p>
        </div>
        <AnalyticsExportButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid revenue</p>
          <p className="mt-2 font-serif text-3xl">{formatPkr(metrics.revenueAllTime ?? 0)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue today</p>
          <p className="mt-2 font-serif text-3xl">{formatPkr(metrics.revenueToday)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">All orders</p>
          <p className="mt-2 font-serif text-3xl">{metrics.totalOrders}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Customers</p>
          <p className="mt-2 font-serif text-3xl">{metrics.totalCustomers}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Live products</p>
          <p className="mt-2 font-serif text-3xl">{metrics.publishedProducts}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending orders</p>
          <p className="mt-2 font-serif text-3xl">{metrics.pendingOrders}</p>
          <Link href="/admin/orders?status=pending" className="mt-2 inline-block text-xs underline">
            Open queue
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Open returns</p>
          <p className="mt-2 font-serif text-3xl">{metrics.openReturns ?? 0}</p>
          <Link href="/admin/returns" className="mt-2 inline-block text-xs underline">
            Review RMAs
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending reviews</p>
          <p className="mt-2 font-serif text-3xl">{metrics.pendingReviews ?? 0}</p>
          <Link href="/admin/reviews" className="mt-2 inline-block text-xs underline">
            Moderate
          </Link>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-2xl">Orders by status</h2>
          {statuses.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {statuses.map(([status, count]) => (
                <li key={status} className="flex justify-between">
                  <span className="capitalize">{status.replaceAll("_", " ")}</span>
                  <span>{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-2xl">Top products</h2>
          {metrics.topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Place a few orders to rank the floor.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {metrics.topProducts.map((item) => (
                <li key={item.title} className="flex justify-between gap-4">
                  <span>{item.title}</span>
                  <span className="shrink-0">
                    {item.quantity} sold · {formatPkr(item.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Active discounts: {metrics.activeDiscounts ?? 0}
          </p>
        </section>
      </div>
      <Link href="/admin" className="text-sm underline underline-offset-4">
        Back to dashboard
      </Link>
    </div>
  );
}
