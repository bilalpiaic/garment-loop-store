import Link from "next/link";
import { getCustomerSession, listOrders } from "@/lib/platform";
import { formatPkr } from "@/lib/admin-nav";
import { formatDateTime } from "@/lib/admin-nav";
import { AddressForm, SignOutButton } from "@/components/account/account-forms";
import { PrivacyControls } from "@/components/account/privacy-controls";
import { redirect } from "next/navigation";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Account",
  description: "Your GarmentLoop customer account.",
  path: "/account",
  index: false,
});

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const orders = (await listOrders()).filter(
    (order) =>
      order.customerId === session.customer.id ||
      order.customer.email.toLowerCase() === session.customer.email,
  );
  const loyaltyPoints = session.customer.loyaltyPoints ?? 0;
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-kicker">Account</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">
            {session.customer.fullName || "Your profile"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{session.customer.email}</p>
          <p className="mt-3 text-sm">
            Loyalty points: <span className="font-medium">{loyaltyPoints}</span>
            <span className="text-muted-foreground">
              {" "}
              (1 point per PKR 100 when an order is delivered)
            </span>
          </p>
        </div>
        <SignOutButton />
      </div>
      <section className="flex flex-wrap gap-3 text-sm">
        <Link href="/account/returns" className="underline underline-offset-4 hover:text-olive">
          Returns & exchanges
        </Link>
        <Link href="/account/circular" className="underline underline-offset-4 hover:text-olive">
          Circular wardrobe
        </Link>
        <Link href="/wishlist" className="underline underline-offset-4 hover:text-olive">
          Wishlist
        </Link>
      </section>
      <section className="atelier-panel rounded-lg p-5 sm:p-6">
        <h2 className="font-serif text-2xl tracking-tight">Orders</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No orders yet.{" "}
            <Link href="/shop" className="underline underline-offset-4 hover:text-olive">
              Browse the winter floor
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border/70">
            {orders.map((order) => (
              <li
                key={order.orderNumber}
                className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
              >
                <div>
                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="font-medium hover:text-olive"
                  >
                    {order.orderNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(order.createdAt)} · {order.status}
                  </p>
                </div>
                <span>{formatPkr(order.totalPkr)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="atelier-panel rounded-lg p-5 sm:p-6">
        <h2 className="font-serif text-2xl tracking-tight">Addresses</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {session.addresses.map((address) => (
            <li key={address.id} className="border-b border-border/60 py-3 last:border-0">
              {address.fullName}
              <span className="block text-muted-foreground">
                {address.address}, {address.area}, {address.city}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <AddressForm />
        </div>
      </section>
      <PrivacyControls />
    </div>
  );
}
