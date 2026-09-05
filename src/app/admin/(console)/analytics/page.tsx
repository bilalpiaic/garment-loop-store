import Link from "next/link";
import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getDashboardMetrics } from "@/lib/platform";
import { formatPkr } from "@/lib/admin-nav";

export const metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const access = await loadAdminPage("dashboard.view");
  if (access.forbidden) return <Forbidden />;
  const metrics = await getDashboardMetrics();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reports</p>
        <h1 className="mt-1 font-serif text-3xl">Analytics</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">All orders</p>
          <p className="mt-2 font-serif text-3xl">{metrics.totalOrders}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Customers</p>
          <p className="mt-2 font-serif text-3xl">{metrics.totalCustomers}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Live products</p>
          <p className="mt-2 font-serif text-3xl">{metrics.publishedProducts}</p>
        </div>
      </div>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-serif text-2xl">Top products</h2>
        {metrics.topProducts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Place a few orders to rank the floor.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {metrics.topProducts.map((item) => (
              <li key={item.title} className="flex justify-between">
                <span>{item.title}</span>
                <span>
                  {item.quantity} sold · {formatPkr(item.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Link href="/admin" className="text-sm underline underline-offset-4">
        Back to dashboard
      </Link>
    </div>
  );
}
