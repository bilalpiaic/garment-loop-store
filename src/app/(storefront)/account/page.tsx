import Link from "next/link";
import { getCustomerSession, listOrders } from "@/lib/platform";
import { formatPkr } from "@/lib/admin-nav";
import { formatDateTime } from "@/lib/admin-nav";
import { AddressForm, SignOutButton } from "@/components/account/account-forms";
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
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Account</p>
          <h1 className="mt-2 font-serif text-4xl">{session.customer.fullName || "Your profile"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{session.customer.email}</p>
        </div>
        <SignOutButton />
      </div>
      <section className="flex flex-wrap gap-3 text-sm">
        <Link href="/account/returns" className="underline underline-offset-4">
          Returns & exchanges
        </Link>
        <Link href="/account/circular" className="underline underline-offset-4">
          Circular wardrobe
        </Link>
        <Link href="/wishlist" className="underline underline-offset-4">
          Wishlist
        </Link>
      </section>
      <section>
        <h2 className="font-serif text-2xl">Orders</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No orders yet. <Link href="/shop" className="underline underline-offset-4">Browse the winter floor</Link>.
          </p>
        ) : (
          <ul className="mt-4 divide-y rounded-xl border">
            {orders.map((order) => (
              <li key={order.orderNumber} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <Link href={`/account/orders/${order.orderNumber}`} className="font-medium">
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
      <section>
        <h2 className="font-serif text-2xl">Addresses</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {session.addresses.map((address) => (
            <li key={address.id} className="rounded-xl border px-4 py-3">
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
    </div>
  );
}
