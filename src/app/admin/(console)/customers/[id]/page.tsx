import Link from "next/link";
import { notFound } from "next/navigation";
import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getCustomer } from "@/lib/platform";
import { can } from "@/lib/roles";
import { formatDateTime, formatPkr } from "@/lib/admin-nav";
import { CustomerProfileForm } from "@/components/admin/admin-crud";

export const metadata = { title: "Customer" };

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await loadAdminPage("customers.view");
  if (access.forbidden) return <Forbidden />;
  const { id } = await params;
  const detail = await getCustomer(id);
  if (!detail) notFound();
  const canEdit = can(access.session.user.role, "customers.manage");
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Customer</p>
        <h1 className="mt-1 font-serif text-3xl">{detail.customer.fullName || detail.customer.email}</h1>
        <p className="text-sm text-muted-foreground">{detail.customer.email}</p>
      </div>
      <CustomerProfileForm customer={detail.customer} canEdit={canEdit} />
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-serif text-2xl">Addresses</h2>
        {detail.addresses.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No saved addresses yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {detail.addresses.map((address) => (
              <li key={address.id}>
                {address.fullName} · {address.address}, {address.area}, {address.city}
                {address.isDefault ? " (default)" : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-serif text-2xl">Orders</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {detail.orders.map((order) => (
            <li key={order.orderNumber} className="flex justify-between">
              <Link href={`/admin/orders/${order.orderNumber}`} className="underline-offset-4 hover:underline">
                {order.orderNumber}
              </Link>
              <span>
                {formatPkr(order.totalPkr)} · {formatDateTime(order.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
