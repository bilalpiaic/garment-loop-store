import Link from "next/link";
import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { listCustomers } from "@/lib/platform";
import { formatDateTime, formatPkr } from "@/lib/admin-nav";

export const metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  const access = await loadAdminPage("customers.view");
  if (access.forbidden) return <Forbidden />;
  const customers = await listCustomers();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">People</p>
        <h1 className="mt-1 font-serif text-3xl">Customers</h1>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th>Orders</th>
              <th>Spend</th>
              <th>Last order</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-t">
                <td className="px-4 py-3">
                  <Link href={`/admin/customers/${customer.id}`} className="font-medium underline-offset-4 hover:underline">
                    {customer.fullName || customer.email}
                  </Link>
                  <p className="text-xs text-muted-foreground">{customer.email}</p>
                </td>
                <td>{customer.ordersCount}</td>
                <td>{formatPkr(customer.totalSpendPkr)}</td>
                <td>{customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Customers appear after login or guest checkout.
          </p>
        ) : null}
      </div>
    </div>
  );
}
