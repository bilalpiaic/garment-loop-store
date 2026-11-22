import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatPkr } from "@/lib/admin-nav";
import {
  getCustomerSession,
  listCircularSubscriptionsForCustomer,
  listRepairsForCustomer,
  listTakeBacksForCustomer,
} from "@/lib/platform";

export const metadata = { title: "Circular account" };

export default async function AccountCircularPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");

  const [takeBacks, repairs, subscriptions] = await Promise.all([
    listTakeBacksForCustomer(session.customer.id, session.customer.email),
    listRepairsForCustomer(session.customer.id, session.customer.email),
    listCircularSubscriptionsForCustomer(session.customer.id, session.customer.email),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Account</p>
          <h1 className="mt-2 font-serif text-4xl">Circular wardrobe</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Your take-backs, repairs, and loop subscriptions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/circular" />}>
            Circular hub
          </Button>
          <Button variant="outline" render={<Link href="/account" />}>
            Back to orders
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Subscriptions</h2>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            None yet.{" "}
            <Link href="/circular/subscribe" className="underline underline-offset-4">
              Browse plans
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-3">
            {subscriptions.map((item) => (
              <li key={item.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.planName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.id} · {formatPkr(item.pricePkr)}/{item.billingInterval}
                      {item.mock ? " · mock" : ""} · {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {item.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-2xl">Take-backs</h2>
          <Link href="/circular/take-back" className="text-sm underline underline-offset-4">
            New take-back
          </Link>
        </div>
        {takeBacks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No take-back requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {takeBacks.map((item) => (
              <li key={item.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.id}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {item.status}
                  </Badge>
                </div>
                <ul className="mt-2 text-sm text-muted-foreground">
                  {item.items.map((line, index) => (
                    <li key={`${line.description}-${index}`}>
                      {line.description} · {line.condition} · ×{line.quantity}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-2xl">Repairs</h2>
          <Link href="/circular/repair" className="text-sm underline underline-offset-4">
            Book repair
          </Link>
        </div>
        {repairs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No repair requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {repairs.map((item) => (
              <li key={item.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.id}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {item.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <p className="mt-2 text-sm">{item.garmentDescription}</p>
                <p className="text-sm text-muted-foreground">{item.issue}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
