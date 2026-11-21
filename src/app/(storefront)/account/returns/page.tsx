import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession, listReturnsForCustomer } from "@/lib/platform";
import { formatDateTime } from "@/lib/admin-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Returns" };

export default async function AccountReturnsPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const returns = await listReturnsForCustomer(session.customer.id, session.customer.email);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Account</p>
          <h1 className="mt-2 font-serif text-4xl">Returns</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Track return and exchange requests. Start a new request from a shipped or delivered order.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/account" />}>
          Back to orders
        </Button>
      </div>

      {returns.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-16 text-center">
          <p className="font-serif text-2xl">No return requests yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Open an order and choose items to return or exchange.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {returns.map((item) => (
            <li key={item.id} className="rounded-xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {item.id} ·{" "}
                    <Link
                      href={`/account/orders/${item.orderNumber}`}
                      className="underline underline-offset-4"
                    >
                      {item.orderNumber}
                    </Link>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                    {item.reasonCode ? ` · ${item.reasonCode.replaceAll("_", " ")}` : ""}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
